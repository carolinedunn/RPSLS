/**
 * Rock Paper Scissors (and RPSLS) Arena
 * A feature-rich browser game with animations, sound effects, stats, and tactical AI.
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
      // Pure random
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

    // 3. 60% chance to counter player's likely move, 40% random to avoid predictability
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

    // Scores
    this.playerScore = 0;
    this.cpuScore = 0;
    this.ties = 0;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.totalMatches = 0;
    this.history = [];

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
      modalOkBtn: document.getElementById('modal-ok-btn')
    };

    this.init();
  }

  init() {
    this.loadState();
    this.updateStatsUI();
    this.updateSoundIcon();
    this.bindEvents();
    this.applyMode(this.currentMode);
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
        history: this.history.slice(0, 20)
      };
      localStorage.setItem('rps_game_state', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save game state', e);
    }
  }

  bindEvents() {
    // Weapon Buttons
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
    this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

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
    } else {
      this.dom.modeRpslsBtn.classList.add('active');
      this.dom.modeClassicBtn.classList.remove('active');
      this.dom.rpslsOnlyButtons.forEach(btn => btn.classList.remove('hidden'));
      this.dom.gameTitle.textContent = 'Rock • Paper • Scissors • Lizard • Spock';
    }
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
  // ROUND EXECUTION & SHOWDOWN
  // ==========================================

  playRound(playerChoiceId) {
    if (this.isFighting) return;
    if (!WEAPONS[playerChoiceId]) return;

    const playerWeapon = WEAPONS[playerChoiceId];
    this.sound.playClick();

    // AI makes its choice
    const cpuDifficulty = this.dom.aiSelect.value;
    const cpuChoiceId = this.ai.getChoice(this.currentMode, cpuDifficulty);
    const cpuWeapon = WEAPONS[cpuChoiceId];

    // Record player move in AI history
    this.ai.recordMove(playerChoiceId);

    // Lock interactions during shake animation
    this.isFighting = true;
    this.setControlsDisabled(true);

    // Highlight selected button
    this.dom.weaponButtons.forEach(b => {
      b.classList.toggle('selected', b.dataset.choice === playerChoiceId);
    });

    // Reset arena presentation
    this.resetArenaVisuals();

    // Show shake fists (✊) and start animation
    this.dom.playerEmoji.textContent = '✊';
    this.dom.cpuEmoji.textContent = '✊';
    this.dom.playerChoiceName.textContent = 'Ready...';
    this.dom.cpuChoiceName.textContent = 'Ready...';

    this.dom.playerFighter.classList.add('shaking');
    this.dom.cpuFighter.classList.add('shaking');

    // Show countdown
    this.dom.battleCountdown.classList.remove('hidden');
    this.dom.outcomeBox.classList.add('hidden');

    let countStep = 0;
    const steps = ['3', '2', '1', 'SHOOT!'];

    const countInterval = setInterval(() => {
      if (countStep < steps.length) {
        this.dom.battleCountdown.textContent = steps[countStep];
        this.sound.playShake();
        countStep++;
      } else {
        clearInterval(countInterval);
        this.revealOutcome(playerWeapon, cpuWeapon);
      }
    }, 180);
  }

  resetArenaVisuals() {
    this.dom.playerHandDisplay.className = 'hand-display';
    this.dom.cpuHandDisplay.className = 'hand-display';
    this.dom.outcomeHeadline.className = 'outcome-headline';
  }

  revealOutcome(playerWeapon, cpuWeapon) {
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
      this.sound.playWin();
    } else if (result === 'lose') {
      this.cpuScore++;
      this.currentStreak = 0;
      this.dom.cpuHandDisplay.classList.add('winner-glow');
      this.dom.playerHandDisplay.classList.add('loser-glow');
      this.dom.outcomeHeadline.textContent = '💀 Computer Wins!';
      this.dom.outcomeHeadline.classList.add('lose');
      this.sound.playLose();
    } else {
      this.ties++;
      this.dom.playerHandDisplay.classList.add('tie-glow');
      this.dom.cpuHandDisplay.classList.add('tie-glow');
      this.dom.outcomeHeadline.textContent = '🤝 It\'s a Tie!';
      this.dom.outcomeHeadline.classList.add('tie');
      this.sound.playTie();
    }

    this.totalMatches++;
    this.dom.outcomeDetail.textContent = explanation;

    // Update history
    this.addHistoryRecord({
      result,
      player: playerWeapon,
      cpu: cpuWeapon,
      detail: explanation,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    // Update stats UI
    this.updateStatsUI();
    this.saveState();

    // Re-enable controls
    setTimeout(() => {
      this.setControlsDisabled(false);
      this.isFighting = false;
    }, 400);
  }

  setControlsDisabled(disabled) {
    this.dom.weaponButtons.forEach(b => {
      b.disabled = disabled;
    });
  }

  // ==========================================
  // STATS & HISTORY
  // ==========================================

  updateStatsUI() {
    this.dom.playerScoreText.textContent = this.playerScore;
    this.dom.cpuScoreText.textContent = this.cpuScore;
    this.dom.tiesScoreText.textContent = this.ties;
    this.dom.currentStreakText.textContent = this.currentStreak;
    this.dom.bestStreakText.textContent = this.bestStreak;
    this.dom.totalMatchesText.textContent = this.totalMatches;

    const winRate = this.totalMatches > 0
      ? Math.round((this.playerScore / this.totalMatches) * 100)
      : 0;
    this.dom.winRateText.textContent = `${winRate}%`;
  }

  addHistoryRecord(record) {
    this.history.unshift(record);
    if (this.history.length > 20) {
      this.history.pop();
    }
    this.renderHistory();
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.dom.historyList.innerHTML = '<div class="empty-history">No rounds played yet. Make your first move on the left!</div>';
      return;
    }

    this.dom.historyList.innerHTML = this.history.map(item => {
      const badgeText = item.result.toUpperCase();
      return `
        <div class="history-item ${item.result}">
          <div class="history-matchup">
            <span class="history-badge ${item.result}">${badgeText}</span>
            <span>${item.player.emoji} ${item.player.name} vs ${item.cpu.emoji} ${item.cpu.name}</span>
          </div>
          <div class="history-desc">${item.detail}</div>
        </div>
      `;
    }).join('');
  }

  resetScores() {
    if (confirm('Are you sure you want to reset all scores and streak statistics?')) {
      this.sound.playClick();
      this.playerScore = 0;
      this.cpuScore = 0;
      this.ties = 0;
      this.currentStreak = 0;
      this.bestStreak = 0;
      this.totalMatches = 0;
      this.ai.reset();
      this.updateStatsUI();
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
