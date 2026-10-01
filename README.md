# Tic-Tac-Toe AI

An unbeatable Tic-Tac-Toe game featuring a sophisticated AI opponent powered by the Minimax algorithm. Built with vanilla JavaScript and modern web technologies, this Progressive Web App (PWA) delivers a clean, editorial look that adapts to phones, tablets and desktops.

## 🎮 Live Demo

**[Play Now](https://anubhavlal07.github.io/Tic-Tac-Toe-AI/)**

## ✨ Features

### 🤖 Intelligent AI
- **Trap AI** (`trap_ai.js`): Never loses, and among all non-losing moves picks the one most likely to make you blunder into a fork, always winning as fast as possible. A perfect player can still force a draw, since Tic-Tac-Toe is a solved draw
- **Strategic Gameplay**: Perfect decision-making that adapts to your moves
- **Difficulty Options**: Choose who starts first - you or the AI

### 🎨 Modern Design
- **Editorial UI**: Warm paper and ink palette with CSS-drawn X and O marks
- **Dark Mode**: Follows your system theme by default, with a manual toggle
- **Adaptive Layout**: Single column with a bottom-sheet picker on phones; board beside a side panel on desktops, tablets in landscape and phones in landscape
- **Animated Win Lines**: The winning line lights up and the rest of the board fades
- **Smooth Transitions**: Board flips on a new game; motion is reduced when the OS asks for it

### 📊 Progress Tracking
- **Score Persistence**: Tracks wins, losses, and ties using localStorage
- **Statistics Dashboard**: View your performance history at a glance
- **Cross-Session Memory**: Your stats persist even after closing the browser

### 📱 Progressive Web App (PWA)
- **Installable**: Add to home screen on mobile and desktop devices
- **Offline Support**: Play anytime, anywhere with service worker caching
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
├── index.html          # Main HTML structure
├── trap_ai.js          # Trap-setting perfect-play AI
├── style.css           # Responsive layout and light/dark themes
├── index.js            # Game logic and UI interactions
├── minimax_algo.js     # AI implementation with Minimax algorithm
├── manifest.json       # PWA manifest configuration
├── sw.js               # Service worker for offline support
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
└── README.md           # Documentation
```

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