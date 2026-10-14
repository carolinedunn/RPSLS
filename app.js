/**
 * Rock Paper Scissors (and RPSLS) Arena
 * A feature-rich browser game with animations, sound effects, stats, tactical AI,
 * telemetry dashboard, and auto-play engine.
 */

// ==========================================
// CONSTANTS & GAME DEFINITIONS
// ==========================================

const WEAPONS = {
  rock: {
    id: 'rock',
    name: 'Rock',
    emoji: '🪨',
    beats: {
      scissors: 'crushes',
      lizard: 'crushes'
    }
  },
  paper: {
    id: 'paper',
    name: 'Paper',
    emoji: '📄',
    beats: {
      rock: 'covers',
      spock: 'disproves'
    }
  },
  scissors: {
    id: 'scissors',
    name: 'Scissors',
    emoji: '✂️',
    beats: {
      paper: 'cuts',
      lizard: 'decapitates'
    }
  },
  lizard: {
    id: 'lizard',
    name: 'Lizard',
    emoji: '🦎',
    beats: {
      spock: 'poisons',
      paper: 'eats'
    }
  },
  spock: {
    id: 'spock',
    name: 'Spock',
    emoji: '🖖',
    beats: {
      scissors: 'smashes',
      rock: 'vaporizes'
    }
  }
};

const MODES = {
  classic: ['rock', 'paper', 'scissors'],
  rpsls: ['rock', 'paper', 'scissors', 'lizard', 'spock']
};

// ==========================================
// AUDIO SYNTHESIZER (Web Audio API)
// ==========================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('rps_muted') === 'true';
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(frequency, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playClick() {
    this.playTone(600, 'sine', 0.08, 0.08);
  }

  playShake() {
    this.playTone(220, 'triangle', 0.1, 0.1);
  }

  playWin() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'triangle', 0.22, 0.12);
        }, idx * 90);
      });
    } catch (e) {
      console.warn('Win sound failed', e);
    }
  }

  playLose() {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const notes = [392.00, 311.13, 261.63]; // G4, Eb4, C4
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'sawtooth', 0.25, 0.08);
        }, idx * 120);
      });
    } catch (e) {
      console.warn('Lose sound failed', e);
    }
  }

  playTie() {
    this.playTone(440, 'sine', 0.25, 0.1);
    setTimeout(() => this.playTone(440, 'sine', 0.25, 0.1), 100);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('rps_muted', this.muted);
    return this.muted;
  }
}

// ==========================================
// TACTICAL AI ENGINE
// ==========================================

class OpponentAI {
  constructor() {
    this.playerHistory = [];
  }

  recordMove(move) {
    this.playerHistory.push(move);
    if (this.playerHistory.length > 30) {
      this.playerHistory.shift();
    }
  }

  getChoice(mode, difficulty = 'casual') {
    const available = MODES[mode];

    if (difficulty === 'casual' || this.playerHistory.length < 2) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Tactical AI:
    // 1. Analyze player's move distribution
    const counts = {};
    available.forEach(m => counts[m] = 0);
    this.playerHistory.forEach(m => {
      if (counts[m] !== undefined) counts[m]++;
    });

    // 2. Identify player's most frequent move
    let mostFrequent = available[0];
    let maxCount = -1;
    for (const move of available) {
      if (counts[move] > maxCount) {
        maxCount = counts[move];
        mostFrequent = move;
      }
    }

    // 3. 65% chance to counter player's likely move, 35% random to avoid predictability
    if (Math.random() < 0.65) {
      const counters = available.filter(candidate => {
        const weapon = WEAPONS[candidate];
        return weapon.beats && weapon.beats[mostFrequent];
      });
      if (counters.length > 0) {
        return counters[Math.floor(Math.random() * counters.length)];
      }
    }

    return available[Math.floor(Math.random() * available.length)];
  }

  reset() {
    this.playerHistory = [];
  }
}

// ==========================================
// GAME STATE & CONTROLLER
// ==========================================

class GameController {
  constructor() {
    this.sound = new SoundManager();
    this.ai = new OpponentAI();
    this.currentMode = 'classic';
    this.isFighting = false;

    // Scores & Match Counts
    this.playerScore = 0;
    this.cpuScore = 0;
    this.ties = 0;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.totalMatches = 0;
    this.history = [];

    // Per-Move Telemetry Stats
    this.moveStats = {
      rock: { picks: 0, wins: 0, losses: 0, ties: 0 },
      paper: { picks: 0, wins: 0, losses: 0, ties: 0 },
      scissors: { picks: 0, wins: 0, losses: 0, ties: 0 },
      lizard: { picks: 0, wins: 0, losses: 0, ties: 0 },
      spock: { picks: 0, wins: 0, losses: 0, ties: 0 }
    };

    // Auto-Play Engine State
    this.isAutoplay = false;
    this.autoplaySpeed = 800; // ms
    this.autoplayTimer = null;

    // DOM References
    this.dom = {
      gameTitle: document.getElementById('game-title'),
      modeClassicBtn: document.getElementById('mode-classic-btn'),
      modeRpslsBtn: document.getElementById('mode-rpsls-btn'),
      aiSelect: document.getElementById('ai-difficulty'),
      soundBtn: document.getElementById('sound-toggle-btn'),
      soundIcon: document.getElementById('sound-icon'),
      rulesBtn: document.getElementById('rules-btn'),
      playerScoreText: document.getElementById('player-score'),
      cpuScoreText: document.getElementById('cpu-score'),
      tiesScoreText: document.getElementById('ties-score'),
      currentStreakText: document.getElementById('current-streak'),
      bestStreakText: document.getElementById('best-streak'),
      totalMatchesText: document.getElementById('total-matches'),
      winRateText: document.getElementById('win-rate'),
      resetScoreBtn: document.getElementById('reset-score-btn'),
      playerHandDisplay: document.getElementById('player-hand-display'),
      playerEmoji: document.getElementById('player-emoji'),
      playerChoiceName: document.getElementById('player-choice-name'),
      cpuHandDisplay: document.getElementById('cpu-hand-display'),
      cpuEmoji: document.getElementById('cpu-emoji'),
      cpuChoiceName: document.getElementById('cpu-choice-name'),
      playerFighter: document.querySelector('.player-fighter'),
      cpuFighter: document.querySelector('.cpu-fighter'),
      battleCountdown: document.getElementById('battle-countdown'),
      outcomeBox: document.getElementById('outcome-box'),
      outcomeHeadline: document.getElementById('outcome-headline'),
      outcomeDetail: document.getElementById('outcome-detail'),
      weaponButtons: document.querySelectorAll('.weapon-btn'),
      rpslsOnlyButtons: document.querySelectorAll('.rpsls-only'),
      historyList: document.getElementById('history-list'),
      clearHistoryBtn: document.getElementById('clear-history-btn'),
      modal: document.getElementById('rules-modal'),
      closeModalBtn: document.getElementById('close-modal-btn'),
      modalOkBtn: document.getElementById('modal-ok-btn'),

      // Telemetry Dashboard DOM
      telemTotalMatches: document.getElementById('telem-total-matches'),
      telemWinRate: document.getElementById('telem-win-rate'),
      telemWinMeter: document.getElementById('telem-win-meter'),
      telemWinsBadge: document.getElementById('telem-wins-badge'),
      telemLossesBadge: document.getElementById('telem-losses-badge'),
      telemTiesBadge: document.getElementById('telem-ties-badge'),
      telemStreakHint: document.getElementById('telem-streak-hint'),
      telemMvpMove: document.getElementById('telem-mvp-move'),
      movesModeTag: document.getElementById('moves-mode-tag'),
      logCountPill: document.getElementById('log-count-pill'),

      // Auto-Play Console DOM
      autoplayToggleBtn: document.getElementById('autoplay-toggle-btn'),
      autoplayBtnIcon: document.getElementById('autoplay-btn-icon'),
      autoplayBtnText: document.getElementById('autoplay-btn-text'),
      autoplayStatusBadge: document.getElementById('autoplay-status-badge'),
      autoplayStatusLabel: document.getElementById('autoplay-status-label'),
      autoplaySpeedSlider: document.getElementById('autoplay-speed-slider'),
      autoplaySpeedVal: document.getElementById('autoplay-speed-val'),
      presetPills: document.querySelectorAll('.preset-pill')
    };

    this.init();
  }

  init() {
    this.loadState();
    this.updateStatsUI();
    this.updateTelemetryUI();
    this.updateSoundIcon();
    this.bindEvents();
    this.applyMode(this.currentMode);

    // Check for auto-play URL param (e.g. ?autoplay=true or #autoplay)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoplay') === 'true' || urlParams.get('autoplay') === '1' || window.location.hash === '#autoplay') {
      setTimeout(() => this.startAutoplay(), 400);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('rps_game_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.playerScore = parsed.playerScore || 0;
        this.cpuScore = parsed.cpuScore || 0;
        this.ties = parsed.ties || 0;
        this.currentStreak = parsed.currentStreak || 0;
        this.bestStreak = parsed.bestStreak || 0;
        this.totalMatches = parsed.totalMatches || 0;
        this.history = Array.isArray(parsed.history) ? parsed.history : [];
        if (parsed.moveStats) {
          this.moveStats = Object.assign(this.moveStats, parsed.moveStats);
        }
        this.renderHistory();
      }
    } catch (e) {
      console.warn('Failed to load saved game state', e);
    }
  }

  saveState() {
    try {
      const state = {
        playerScore: this.playerScore,
        cpuScore: this.cpuScore,
        ties: this.ties,
        currentStreak: this.currentStreak,
        bestStreak: this.bestStreak,
        totalMatches: this.totalMatches,
        moveStats: this.moveStats,
        history: this.history.slice(0, 50)
      };
      localStorage.setItem('rps_game_state', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save game state', e);
    }
  }

  bindEvents() {
    // Weapon Buttons (Manual play)
    this.dom.weaponButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice;
        this.playRound(choice);
      });
    });

    // Mode Switch
    this.dom.modeClassicBtn.addEventListener('click', () => this.applyMode('classic'));
    this.dom.modeRpslsBtn.addEventListener('click', () => this.applyMode('rpsls'));

    // Sound toggle
    this.dom.soundBtn.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.updateSoundIcon();
      if (!isMuted) this.sound.playClick();
    });

    // Rules Modal
    this.dom.rulesBtn.addEventListener('click', () => this.openRulesModal());
    this.dom.closeModalBtn.addEventListener('click', () => this.closeRulesModal());
    this.dom.modalOkBtn.addEventListener('click', () => this.closeRulesModal());
    this.dom.modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.closeRulesModal();
      }
    });

    // Reset scores & clear history
    this.dom.resetScoreBtn.addEventListener('click', () => this.resetScores());
    if (this.dom.clearHistoryBtn) {
      this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    // Auto-Play Controls
    if (this.dom.autoplayToggleBtn) {
      this.dom.autoplayToggleBtn.addEventListener('click', () => this.toggleAutoplay());
    }

    if (this.dom.autoplaySpeedSlider) {
      this.dom.autoplaySpeedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.setAutoplaySpeed(val);
      });
    }

    this.dom.presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const speed = parseInt(pill.dataset.speed, 10);
        this.setAutoplaySpeed(speed);
        if (this.dom.autoplaySpeedSlider) {
          this.dom.autoplaySpeedSlider.value = speed;
        }
      });
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(e) {
    if (this.dom.modal && !this.dom.modal.classList.contains('hidden')) {
      if (e.key === 'Escape') this.closeRulesModal();
      return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === '1') this.playRound('rock');
    if (e.key === '2') this.playRound('paper');
    if (e.key === '3') this.playRound('scissors');
    if (this.currentMode === 'rpsls') {
      if (e.key === '4') this.playRound('lizard');
      if (e.key === '5') this.playRound('spock');
    }
    if (e.key.toLowerCase() === 'm') {
      this.dom.soundBtn.click();
    }
    if (e.key.toLowerCase() === 'a' || (e.code === 'Space' && !this.isFighting)) {
      e.preventDefault();
      this.toggleAutoplay();
    }
    if (e.key === '?') {
      this.openRulesModal();
    }
  }

  applyMode(mode) {
    this.currentMode = mode;
    this.sound.playClick();

    if (mode === 'classic') {
      this.dom.modeClassicBtn.classList.add('active');
      this.dom.modeRpslsBtn.classList.remove('active');
      this.dom.rpslsOnlyButtons.forEach(btn => btn.classList.add('hidden'));
      this.dom.gameTitle.textContent = 'Rock • Paper • Scissors';
      if (this.dom.movesModeTag) this.dom.movesModeTag.textContent = 'Classic Mode (3 Moves)';
    } else {
      this.dom.modeRpslsBtn.classList.add('active');
      this.dom.modeClassicBtn.classList.remove('active');
      this.dom.rpslsOnlyButtons.forEach(btn => btn.classList.remove('hidden'));
      this.dom.gameTitle.textContent = 'Rock • Paper • Scissors • Lizard • Spock';
      if (this.dom.movesModeTag) this.dom.movesModeTag.textContent = 'RPSLS Mode (5 Moves)';
    }
    this.updateTelemetryUI();
  }

  updateSoundIcon() {
    this.dom.soundIcon.textContent = this.sound.muted ? '🔇' : '🔊';
  }

  openRulesModal() {
    this.sound.playClick();
    this.dom.modal.classList.remove('hidden');
  }

  closeRulesModal() {
    this.sound.playClick();
    this.dom.modal.classList.add('hidden');
  }

  // ==========================================
  // AUTO-PLAY ENGINE
  // ==========================================

  toggleAutoplay() {
    if (this.isAutoplay) {
      this.pauseAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  startAutoplay() {
    this.isAutoplay = true;
    this.sound.playClick();

    if (this.dom.autoplayToggleBtn) {
      this.dom.autoplayToggleBtn.classList.add('playing');
      this.dom.autoplayBtnIcon.textContent = '⏸';
      this.dom.autoplayBtnText.textContent = 'Pause Auto-Play';
    }

    if (this.dom.autoplayStatusBadge) {
      this.dom.autoplayStatusBadge.classList.add('active');
      this.dom.autoplayStatusLabel.textContent = `Auto-Play: ${this.autoplaySpeed}ms`;
    }

    this.queueNextAutoplay(100);
  }

  pauseAutoplay() {
    this.isAutoplay = false;
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }

    if (this.dom.autoplayToggleBtn) {
      this.dom.autoplayToggleBtn.classList.remove('playing');
      this.dom.autoplayBtnIcon.textContent = '▶';
      this.dom.autoplayBtnText.textContent = 'Start Auto-Play';
    }

    if (this.dom.autoplayStatusBadge) {
      this.dom.autoplayStatusBadge.classList.remove('active');
      this.dom.autoplayStatusLabel.textContent = 'Auto-Play: Off';
    }
  }

  setAutoplaySpeed(speedMs) {
    this.autoplaySpeed = Math.max(100, speedMs);
    if (this.dom.autoplaySpeedVal) {
      this.dom.autoplaySpeedVal.textContent = `${this.autoplaySpeed}ms`;
    }

    if (this.isAutoplay && this.dom.autoplayStatusLabel) {
      this.dom.autoplayStatusLabel.textContent = `Auto-Play: ${this.autoplaySpeed}ms`;
    }

    // Update active preset pill highlight
    this.dom.presetPills.forEach(pill => {
      const pSpeed = parseInt(pill.dataset.speed, 10);
      pill.classList.toggle('active', Math.abs(pSpeed - this.autoplaySpeed) < 100);
    });
  }

  queueNextAutoplay(delayMs) {
    if (!this.isAutoplay) return;
    if (this.autoplayTimer) clearTimeout(this.autoplayTimer);

    const delay = typeof delayMs === 'number' ? delayMs : this.autoplaySpeed;
    this.autoplayTimer = setTimeout(() => {
      this.runAutoplayStep();
    }, delay);
  }

  runAutoplayStep() {
    if (!this.isAutoplay) return;
    if (this.isFighting) {
      // Retry in 100ms if a fight is currently animating
      this.queueNextAutoplay(100);
      return;
    }

    // Choose random weapon from active mode
    const available = MODES[this.currentMode];
    const pick = available[Math.floor(Math.random() * available.length)];
    this.playRound(pick, true);
  }

  // ==========================================
  // ROUND EXECUTION & SHOWDOWN
  // ==========================================

  playRound(playerChoiceId, isAuto = false) {
    if (this.isFighting) return;
    if (!WEAPONS[playerChoiceId]) return;

    const playerWeapon = WEAPONS[playerChoiceId];
    if (!isAuto || this.autoplaySpeed > 300) {
      this.sound.playClick();
    }

    // AI makes its choice
    const cpuDifficulty = this.dom.aiSelect.value;
    const cpuChoiceId = this.ai.getChoice(this.currentMode, cpuDifficulty);
    const cpuWeapon = WEAPONS[cpuChoiceId];

    // Record player move in AI history
    this.ai.recordMove(playerChoiceId);

    // Lock interactions during showdown
    this.isFighting = true;
    this.setControlsDisabled(true);

    // Highlight selected button
    this.dom.weaponButtons.forEach(b => {
      b.classList.toggle('selected', b.dataset.choice === playerChoiceId);
    });

    // Reset arena presentation
    this.resetArenaVisuals();

    // Fast-track animation if in fast auto-play (<= 350ms)
    if (isAuto && this.autoplaySpeed <= 350) {
      this.revealOutcome(playerWeapon, cpuWeapon, true);
      return;
    }

    // Standard / Scaled Animated Showdown
    this.dom.playerEmoji.textContent = '✊';
    this.dom.cpuEmoji.textContent = '✊';
    this.dom.playerChoiceName.textContent = 'Ready...';
    this.dom.cpuChoiceName.textContent = 'Ready...';

    this.dom.playerFighter.classList.add('shaking');
    this.dom.cpuFighter.classList.add('shaking');

    this.dom.battleCountdown.classList.remove('hidden');
    this.dom.outcomeBox.classList.add('hidden');

    const stepDelay = isAuto ? Math.max(60, Math.floor(this.autoplaySpeed / 5)) : 160;
    let countStep = 0;
    const steps = isAuto && this.autoplaySpeed < 600 ? ['READY', 'SHOOT!'] : ['3', '2', '1', 'SHOOT!'];

    let countInterval = null;
    countInterval = setInterval(() => {
      if (countStep < steps.length) {
        this.dom.battleCountdown.textContent = steps[countStep];
        if (!isAuto || this.autoplaySpeed > 400) {
          this.sound.playShake();
        }
        countStep++;
      } else {
        if (countInterval) clearInterval(countInterval);
        this.revealOutcome(playerWeapon, cpuWeapon, isAuto);
      }
    }, stepDelay);
  }

  resetArenaVisuals() {
    this.dom.playerHandDisplay.className = 'hand-display';
    this.dom.cpuHandDisplay.className = 'hand-display';
    this.dom.outcomeHeadline.className = 'outcome-headline';
  }

  revealOutcome(playerWeapon, cpuWeapon, isAuto = false) {
    // Stop shake
    this.dom.playerFighter.classList.remove('shaking');
    this.dom.cpuFighter.classList.remove('shaking');
    this.dom.battleCountdown.classList.add('hidden');
    this.dom.outcomeBox.classList.remove('hidden');

    // Reveal choices
    this.dom.playerEmoji.textContent = playerWeapon.emoji;
    this.dom.playerChoiceName.textContent = playerWeapon.name;
    this.dom.cpuEmoji.textContent = cpuWeapon.emoji;
    this.dom.cpuChoiceName.textContent = cpuWeapon.name;

    // Evaluate Result
    let result = ''; // 'win', 'lose', 'tie'
    let explanation = '';

    if (playerWeapon.id === cpuWeapon.id) {
      result = 'tie';
      explanation = `Both chose ${playerWeapon.name}. It's a standoff!`;
    } else if (playerWeapon.beats && playerWeapon.beats[cpuWeapon.id]) {
      result = 'win';
      const verb = playerWeapon.beats[cpuWeapon.id];
      explanation = `${playerWeapon.name} ${verb} ${cpuWeapon.name}!`;
    } else {
      result = 'lose';
      const verb = cpuWeapon.beats[playerWeapon.id] || 'beats';
      explanation = `${cpuWeapon.name} ${verb} ${playerWeapon.name}!`;
    }

    // Apply outcome visual & audio
    const playAudio = !isAuto || this.autoplaySpeed >= 400;

    if (result === 'win') {
      this.playerScore++;
      this.currentStreak++;
      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
      }
      this.dom.playerHandDisplay.classList.add('winner-glow');
      this.dom.cpuHandDisplay.classList.add('loser-glow');
      this.dom.outcomeHeadline.textContent = '🎉 You Win!';
      this.dom.outcomeHeadline.classList.add('win');
      if (playAudio) this.sound.playWin();
    } else if (result === 'lose') {
      this.cpuScore++;
      this.currentStreak = 0;
      this.dom.cpuHandDisplay.classList.add('winner-glow');
      this.dom.playerHandDisplay.classList.add('loser-glow');
      this.dom.outcomeHeadline.textContent = '💀 Computer Wins!';
      this.dom.outcomeHeadline.classList.add('lose');
      if (playAudio) this.sound.playLose();
    } else {
      this.ties++;
      this.dom.playerHandDisplay.classList.add('tie-glow');
      this.dom.cpuHandDisplay.classList.add('tie-glow');
      this.dom.outcomeHeadline.textContent = '🤝 It\'s a Tie!';
      this.dom.outcomeHeadline.classList.add('tie');
      if (playAudio) this.sound.playTie();
    }

    this.totalMatches++;
    this.dom.outcomeDetail.textContent = explanation;

    // Record Move Telemetry
    const mStat = this.moveStats[playerWeapon.id];
    if (mStat) {
      mStat.picks++;
      if (result === 'win') mStat.wins++;
      else if (result === 'lose') mStat.losses++;
      else if (result === 'tie') mStat.ties++;
    }

    // Update history stream
    this.addHistoryRecord({
      round: this.totalMatches,
      result,
      player: playerWeapon,
      cpu: cpuWeapon,
      detail: explanation,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    // Update UI & save state
    this.updateStatsUI();
    this.updateTelemetryUI();
    this.saveState();

    // Re-enable controls / schedule next round
    const unlockDelay = isAuto && this.autoplaySpeed <= 350 ? 50 : 350;
    setTimeout(() => {
      this.setControlsDisabled(false);
      this.isFighting = false;

      if (this.isAutoplay) {
        const nextDelay = Math.max(80, this.autoplaySpeed - unlockDelay);
        this.queueNextAutoplay(nextDelay);
      }
    }, unlockDelay);
  }

  setControlsDisabled(disabled) {
    this.dom.weaponButtons.forEach(b => {
      b.disabled = disabled;
    });
  }

  // ==========================================
  // STATS & TELEMETRY UI UPDATES
  // ==========================================

  updateStatsUI() {
    if (this.dom.playerScoreText) this.dom.playerScoreText.textContent = this.playerScore;
    if (this.dom.cpuScoreText) this.dom.cpuScoreText.textContent = this.cpuScore;
    if (this.dom.tiesScoreText) this.dom.tiesScoreText.textContent = this.ties;
    if (this.dom.currentStreakText) this.dom.currentStreakText.textContent = this.currentStreak;
    if (this.dom.bestStreakText) this.dom.bestStreakText.textContent = this.bestStreak;
    if (this.dom.totalMatchesText) this.dom.totalMatchesText.textContent = this.totalMatches;

    const winRate = this.totalMatches > 0
      ? Math.round((this.playerScore / this.totalMatches) * 100)
      : 0;
    if (this.dom.winRateText) this.dom.winRateText.textContent = `${winRate}%`;
  }

  updateTelemetryUI() {
    // 1. Overview KPIs
    if (this.dom.telemTotalMatches) {
      this.dom.telemTotalMatches.textContent = this.totalMatches;
    }

    const overallWinRate = this.totalMatches > 0
      ? ((this.playerScore / this.totalMatches) * 100).toFixed(1)
      : '0.0';

    if (this.dom.telemWinRate) {
      this.dom.telemWinRate.textContent = `${overallWinRate}%`;
    }

    if (this.dom.telemWinMeter) {
      this.dom.telemWinMeter.style.width = `${Math.min(100, Math.max(0, parseFloat(overallWinRate)))}%`;
    }

    if (this.dom.telemWinsBadge) this.dom.telemWinsBadge.textContent = `W: ${this.playerScore}`;
    if (this.dom.telemLossesBadge) this.dom.telemLossesBadge.textContent = `L: ${this.cpuScore}`;
    if (this.dom.telemTiesBadge) this.dom.telemTiesBadge.textContent = `T: ${this.ties}`;
    if (this.dom.telemStreakHint) {
      this.dom.telemStreakHint.textContent = `Streak: ${this.currentStreak} (Best: ${this.bestStreak})`;
    }

    // 2. Per-Move Win-Rates & Analytics
    const activeMoves = MODES[this.currentMode];
    let bestMoveId = null;
    let highestWr = -1;

    activeMoves.forEach(moveId => {
      const stat = this.moveStats[moveId];
      if (!stat) return;

      const picks = stat.picks;
      const share = this.totalMatches > 0
        ? Math.round((picks / this.totalMatches) * 100)
        : 0;
      const wrNum = picks > 0 ? (stat.wins / picks) * 100 : 0;
      const wrText = wrNum.toFixed(1);

      // Track MVP move (must have at least 1 pick)
      if (picks > 0 && wrNum > highestWr) {
        highestWr = wrNum;
        bestMoveId = moveId;
      }

      // Update DOM for this move
      const shareEl = document.getElementById(`${moveId}-share`);
      const pillEl = document.getElementById(`${moveId}-winrate-pill`);
      const meterFill = document.getElementById(`${moveId}-meter-fill`);
      const recordEl = document.getElementById(`${moveId}-record`);
      const wrTextEl = document.getElementById(`${moveId}-wr-text`);

      if (shareEl) shareEl.textContent = `${picks} picks (${share}%)`;
      if (recordEl) recordEl.textContent = `${stat.wins}W · ${stat.losses}L · ${stat.ties}T`;
      if (wrTextEl) wrTextEl.textContent = `Win Rate: ${wrText}%`;

      if (pillEl) {
        pillEl.textContent = `${wrText}% WR`;
        pillEl.className = 'move-stat-pill';
        if (picks === 0) {
          // Neutral
        } else if (wrNum >= 50) {
          pillEl.classList.add('high-wr');
        } else if (wrNum >= 35) {
          pillEl.classList.add('med-wr');
        } else {
          pillEl.classList.add('low-wr');
        }
      }

      if (meterFill) {
        meterFill.style.width = `${Math.min(100, wrNum)}%`;
        if (wrNum >= 50) {
          meterFill.style.background = '#10b981';
        } else if (wrNum >= 35) {
          meterFill.style.background = '#f59e0b';
        } else {
          meterFill.style.background = '#ef4444';
        }
      }
    });

    // Update MVP Move display
    if (this.dom.telemMvpMove) {
      if (bestMoveId && WEAPONS[bestMoveId]) {
        this.dom.telemMvpMove.textContent = `${WEAPONS[bestMoveId].emoji} ${WEAPONS[bestMoveId].name} (${highestWr.toFixed(0)}%)`;
      } else {
        this.dom.telemMvpMove.textContent = '—';
      }
    }
  }

  addHistoryRecord(record) {
    this.history.unshift(record);
    if (this.history.length > 50) {
      this.history.pop();
    }
    this.renderHistory();
  }

  renderHistory() {
    if (!this.dom.historyList) return;

    if (this.dom.logCountPill) {
      this.dom.logCountPill.textContent = `${this.history.length} rounds`;
    }

    if (this.history.length === 0) {
      this.dom.historyList.innerHTML = '<div class="empty-history">Telemetry stream initialized. Make a move or toggle Auto-Play above!</div>';
      return;
    }

    this.dom.historyList.innerHTML = this.history.map(item => {
      const badgeText = item.result.toUpperCase();
      const roundLabel = item.round ? `<span class="history-round-num">#${item.round}</span>` : '';
      return `
        <div class="history-item ${item.result}">
          <div class="history-matchup">
            ${roundLabel}
            <span class="history-badge ${item.result}">${badgeText}</span>
            <span>${item.player.emoji} ${item.player.name} vs ${item.cpu.emoji} ${item.cpu.name}</span>
          </div>
          <div class="history-desc">${item.detail}</div>
        </div>
      `;
    }).join('');
  }

  resetScores() {
    if (confirm('Are you sure you want to reset all scores, move analytics, and telemetry?')) {
      this.sound.playClick();
      this.pauseAutoplay();
      this.playerScore = 0;
      this.cpuScore = 0;
      this.ties = 0;
      this.currentStreak = 0;
      this.bestStreak = 0;
      this.totalMatches = 0;
      this.moveStats = {
        rock: { picks: 0, wins: 0, losses: 0, ties: 0 },
        paper: { picks: 0, wins: 0, losses: 0, ties: 0 },
        scissors: { picks: 0, wins: 0, losses: 0, ties: 0 },
        lizard: { picks: 0, wins: 0, losses: 0, ties: 0 },
        spock: { picks: 0, wins: 0, losses: 0, ties: 0 }
      };
      this.ai.reset();
      this.updateStatsUI();
      this.updateTelemetryUI();
      this.saveState();
    }
  }

  clearHistory() {
    this.sound.playClick();
    this.history = [];
    this.renderHistory();
    this.saveState();
  }
}

// Instantiate the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.rpsGame = new GameController();
});
