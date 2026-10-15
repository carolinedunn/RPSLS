# 🪨 Rock Paper Scissors Arena (with RPSLS Mode)

An interactive, animated Rock-Paper-Scissors game where a user plays against a computer opponent directly in their browser.

---

## 🚀 Features

- **2 Game Modes**:
  - **Classic Mode (3 weapons)**: Rock 🪨 • Paper 📄 • Scissors ✂️
  - **RPSLS Mode (5 weapons)**: Rock 🪨 • Paper 📄 • Scissors ✂️ • Lizard 🦎 • Spock 🖖
- **Showdown Arena**:
  - Dramatic suspense shake animation with "3, 2, 1, SHOOT!" countdown.
  - Winner & loser glow highlights with custom outcome explanations (e.g., *"Spock vaporizes Rock"* or *"Rock crushes Scissors"*).
- **Computer AI Opponents**:
  - **Casual AI**: Pure random choice.
  - **Tactical AI**: Tracks player frequency and counters predictable habits using behavioral pattern analysis.
- **Synthesized Audio Engine**:
  - Built with the native **Web Audio API** (no external audio files or dependencies required).
  - Custom tones for clicks, countdown ticks, victory fanfares, defeat tones, and ties.
  - Mute / Unmute audio toggle (hotkey: `M`).
- **Comprehensive Scoreboard & Analytics**:
  - Player wins, Computer wins, Ties.
  - Real-time Win Rate % and match count.
  - Current winning streak and Best streak record.
  - Round History log displaying the outcome and rationale for recent matches.
  - Persistent state saved to browser `localStorage`.
- **Auto-Play Engine & Live Telemetry Dashboard**:
  - Automated continuous play with adjustable speed presets: ⚡ Fast (0.25s), ⏱ Normal (0.8s), and 🐢 Chill (1.5s).
  - Dynamic telemetry tracking move pick distributions, per-weapon win rates, and MVP best-move detection.
  - Live round history feed streaming results, matchup breakdowns, and tactical insights.
  - See full verification in the [🧪 Test Results Summary](TEST_RESULTS.md).
- **Keyboard Shortcuts**:
  - <kbd>1</kbd>: Rock
  - <kbd>2</kbd>: Paper
  - <kbd>3</kbd>: Scissors
  - <kbd>4</kbd>: Lizard *(RPSLS mode)*
  - <kbd>5</kbd>: Spock *(RPSLS mode)*
  - <kbd>A</kbd> or <kbd>Space</kbd>: Start / Pause Auto-Play
  - <kbd>M</kbd>: Mute / Unmute sound
  - <kbd>?</kbd>: Open rules & guide
  - <kbd>Esc</kbd>: Close modal

---

## 🎮 How to Play

### Option 1: Open Directly in Any Web Browser
Simply double-click [`index.html`](./index.html) or open it with your favorite browser (Chrome, Edge, Firefox, Safari).

### Option 2: Run with Local HTTP Server
You can also run a quick local server using Python:

```bash
# Using Python
py -m http.server 8000
```
Then visit [http://localhost:8000](http://localhost:8000).

---

## 📜 Rules of Engagement

### Classic
- **Rock** 🪨 crushes **Scissors** ✂️
- **Paper** 📄 covers **Rock** 🪨
- **Scissors** ✂️ cuts **Paper** 📄

### RPSLS (Rock • Paper • Scissors • Lizard • Spock)
- ✂️ **Scissors** cuts 📄 **Paper**
- 📄 **Paper** covers 🪨 **Rock**
- 🪨 **Rock** crushes 🦎 **Lizard**
- 🦎 **Lizard** poisons 🖖 **Spock**
- 🖖 **Spock** smashes ✂️ **Scissors**
- ✂️ **Scissors** decapitates 🦎 **Lizard**
- 🦎 **Lizard** eats 📄 **Paper**
- 📄 **Paper** disproves 🖖 **Spock**
- 🖖 **Spock** vaporizes 🪨 **Rock**
- 🪨 **Rock** crushes ✂️ **Scissors**
---

## 📚 A Woman’s Guide to Winning in Tech

If you enjoyed this repo, check out my book, **A Woman’s Guide to Winning in Tech.** This book blends sharp humor with practical career strategies to help women navigate tech on their own terms—without changing who they are. Available on Amazon, Bookshop.org, Barnes & Noble, and IngramSpark.

- [Book Website](https://winningintech.com/) 
- [Amazon](https://amzn.to/3YxHVO7)
- [Instagram](https://www.instagram.com/winning.tech)
- [Facebook](https://www.facebook.com/winningintech)
