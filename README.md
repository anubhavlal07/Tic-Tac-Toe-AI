# Tic-Tac-Toe AI

An unbeatable Tic-Tac-Toe game featuring a sophisticated AI opponent powered by the Minimax algorithm. Built with vanilla JavaScript and modern web technologies, this Progressive Web App (PWA) delivers a clean, editorial look that adapts to phones, tablets and desktops.

## 🎮 Live Demo

**[Play Now](https://anubhavlal07.github.io/Tic-Tac-Toe-AI/)**

## ✨ Features

### 🤖 Intelligent AI
- **Trap AI** (`trap_ai.js`): Never loses, and among all non-losing moves picks the one most likely to make you blunder into a fork, always winning as fast as possible. A perfect player can still force a draw, since Tic-Tac-Toe is a solved draw
- **Strategic Gameplay**: Perfect decision-making that adapts to your moves
- **Difficulty Options**: Choose who starts first - you or the AI
- **Loss Coach**: After a loss, see the exact move that lost, the move that would have held the draw, and a move-by-move review

### 🎮 Game Modes
- **Vs Trap AI**: The unbeatable opponent
- **Two Players**: Pass the device between turns, with names, alternating starters and a session tally
- **Play Online**: Create a room, share a 6-letter code or invite link, and play a friend peer-to-peer over WebRTC (PeerJS). Needs an internet connection; no server of our own
- **Timed Turns**: Optional 3, 5 or 10 second clock; when it runs out a random move is played for you

### 🎨 Modern Design
- **Editorial UI**: Warm paper and ink palette with CSS-drawn X and O marks
- **Dark Mode**: Follows your system theme by default, with a manual toggle
- **Adaptive Layout**: Single column with a bottom-sheet picker on phones; board beside a side panel on desktops, tablets in landscape and phones in landscape
- **Animated Win Lines**: A stroke draws through the winning cells while the rest of the board fades
- **Sound and Vibration**: Synthesized move and result sounds plus haptics on phones, with a mute toggle
- **Smooth Transitions**: Board flips on a new game; motion is reduced when the OS asks for it

### 📊 Progress Tracking
- **Score Persistence**: Tracks wins, losses, and ties using localStorage
- **Streaks and History**: Unbeaten streak against the AI, best streak, and the last 100 games in every mode
- **Replay**: Step through any finished game move by move, with autoplay and keyboard controls
- **Cross-Session Memory**: Your stats persist even after closing the browser

### 📱 Progressive Web App (PWA)
- **Installable**: Add to home screen on mobile and desktop devices
- **Offline Support**: Every mode except online play works offline with service worker caching
- **App-Like Experience**: Runs in standalone mode like a native app
- **Fast Loading**: Optimized assets and caching for instant startup

### ⚡ Performance
- **Mobile Optimized**: Touch-friendly interface with no scrolling issues
- **Lightweight**: Pure vanilla JavaScript with no framework overhead
- **Smooth Animations**: Hardware-accelerated CSS transitions

## 🛠️ Technical Stack

- **HTML5**: Semantic markup with PWA metadata
- **CSS3**: Custom properties, Grid, Flexbox, and smooth animations
- **Vanilla JavaScript**: No frameworks, just pure ES6+
- **PWA Technologies**: Service Worker, Web Manifest, App Icons

## 📂 Project Structure

```
Tic-Tac-Toe-AI/
├── index.html          # Markup, layout slots and script/style tags
├── style.css           # Core layout and light/dark themes
├── index.js            # UI layer (window.UI): sheet, toolbar, slots, scores, theme
├── game.js             # Game core (window.Game): state, events, modes
├── trap_ai.js          # Trap-setting perfect-play AI (window.TrapAI)
├── features/           # One .js + .css pair per feature, loaded after the core
│   ├── mode-ai.js      # "Vs Trap AI" mode
│   ├── mode-local.js   # Two players on one device
│   ├── mode-online.js  # Online play over WebRTC
│   ├── history.js      # Streaks and game history
│   ├── coach.js        # Explains the move that lost the game
│   ├── timer.js        # Timed turns
│   ├── sound.js        # Sound effects and vibration
│   ├── winline.js      # Animated line through the winning cells
│   └── replay.js       # Step-by-step replay of finished games
├── manifest.json       # PWA manifest configuration
├── sw.js               # Service worker for offline support
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
└── README.md           # Documentation
```

## 🧩 Architecture

The game is split into a small core and independent feature files. Features never call each other directly; they listen to `Game` events and draw into `UI` slots.

### `Game` (game.js)

| Member | Purpose |
|---|---|
| `Game.state` | `{ board, moves, turn, first, active, modeId, options, result, session }`. Board cells are `"X"`, `"O"` or `null`. |
| `Game.on(event, fn)` | Subscribe; returns an unsubscribe function. `fn(payload, state)`. |
| `Game.emit(event, payload)` | Fire an event, including custom ones such as `timer:tick`. |
| `Game.start(modeId, options)` | Start a new game. `options.first` is `"X"` or `"O"`. |
| `Game.play(index, player, source)` | Place a mark if legal. `source` is `"local"`, `"ai"`, `"remote"` or `"timeout"`. |
| `Game.abort(reason)` | Stop the current game without a result. |
| `Game.later(ms, fn)` | `setTimeout` that is skipped if the game was restarted or ended. |
| `Game.isLocal(player)` / `Game.isLocalTurn()` | Whether a player is controlled on this device. |
| `Game.perspective()` | The symbol the person on this device plays, or `null` in two-player mode. |
| `Game.names()` | `{ X, O }` display names. |
| `Game.registerMode(def)` / `Game.modes()` / `Game.mode()` | Mode registry. |

Events:

| Event | Payload |
|---|---|
| `start` | `{ modeId, options, first, names, perspective }` |
| `turn` | `{ player, local, moveNumber }` |
| `move` | `{ index, player, source, board, moveNumber }` |
| `end` | Result record (below) |
| `abort` | `{ reason }` |
| `modes` | `{ modes }` |

Result record, also the shape stored by history:

```js
{ id, at, modeId, options, first, moves: [{ index, player }], winner, line, outcome, perspective, names }
```

`winner` is `"X"`, `"O"` or `null`; `outcome` is `"win"`, `"loss"`, `"draw"` from the local player's view, or `null` in two-player mode.

Mode definition:

```js
Game.registerMode({
  id, label, hint, icon, tone, note, order,
  options: [{ label, hint, icon, tone, value }],
  renderOptions(container, start, { back, sheet }) {},
  names(state), isLocal(player, state), perspective(state),
  setup(game, options), onTurn(player, game), teardown(game),
  turnText(player, state), endText(result, state),
});
```

`icon` is `"x"`, `"o"`, `"xo"` or an SVG string; `tone` is `"x"`, `"o"` or `"xo"`. Use either `options` (simple choice cards) or `renderOptions` (custom UI that calls `start(options)`).

### `UI` (index.js)

| Member | Purpose |
|---|---|
| `UI.el(tag, attrs, ...children)` | Small DOM helper; `on*` attrs become listeners, `html` sets innerHTML. |
| `UI.markEl(player, size)` | CSS-drawn X or O mark. |
| `UI.status(text)` / `UI.toast(text, ms)` | Status line and toast. |
| `UI.openSheet({ title, subtitle, content, dismissible, onClose, wide })` | Modal sheet; returns `{ body, close, setTitle }`. |
| `UI.addToolbarButton({ id, label, icon, onClick, pressed, order })` | Icon button in the header toolbar. `pressed` makes it a toggle. |
| `UI.slot(name)` | `"toolbar"`, `"insights"` (cards under the status bar), `"overlay"` (layer over the board) or `"status-extra"` (inside the status bar). |
| `UI.miniBoard(board, { marks, line, size, label })` | Small read-only board. `marks[i]` is `"good"`, `"bad"` or `"focus"`. |
| `UI.openNewGame({ modeId })` | Open the new-game picker. |

Shared CSS classes: `.insight-card`, `.btn`, `.btn-ghost`, `.link-btn`, `.player-card`, `.player-selection`, `.tool-badge`.

## 🚀 Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/anubhavlal07/Tic-Tac-Toe-AI.git
   cd Tic-Tac-Toe-AI
   ```

2. **Start a local server**
   ```bash
   # Using Python
   python -m http.server 8084
   
   # Or using Node.js
   npx serve
   ```

3. **Open in browser**
   ```
   http://localhost:8084
   ```

### Installation as PWA

1. Visit the [live demo](https://anubhavlal07.github.io/Tic-Tac-Toe-AI/)
2. Look for the "Install" prompt in your browser
3. Click to add the app to your home screen/desktop

## 🎯 How to Play

1. **Choose Your Starting Player**: Select whether you or the AI starts first
2. **Make Your Move**: Click on any empty cell to place your mark
3. **Challenge the AI**: Try to outsmart the unbeatable opponent
4. **Track Your Progress**: View your wins, losses, and ties in the score tracker
5. **Reset Anytime**: Click the Reset button to start a fresh game

## 🧠 Algorithm Overview

The AI uses the **Minimax algorithm**, a recursive decision-making algorithm that:

1. Evaluates all possible future game states
2. Assumes both players play optimally
3. Assigns scores to terminal states (win: +10, loss: -10, tie: 0)
4. Selects the move that maximizes the AI's minimum guaranteed score
5. Includes depth-based scoring for optimal move selection

This makes the AI **unbeatable** - the best you can achieve is a tie!

## 🎨 Customization

### Themes
Toggle between light and dark modes using the theme button in the header.

### Colors
Edit CSS custom properties in `style.css` to customize the color scheme:
```css
:root {
  --bg: #f4f1ea;
  --surface: #fffdf8;
  --ink: #1d1b16;
  --x: #e4572e;
  --o: #148f82;
}
```

Dark mode overrides the same variables under `body.dark-mode`.

## 📱 Browser Support

- Chrome/Edge 105+
- Firefox 121+
- Safari 16+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available for educational purposes. Feel free to use it as a learning resource for AI, game theory, and modern web development.

## 👨‍💻 Developer

Created by [Anubhav Lal](https://github.com/anubhavlal07)

---

**Enjoy playing against the unbeatable AI! 🎮**