// Custom Game Modal Functions
const choiceModal = document.getElementById('choiceModal');
const infoToast = document.getElementById('infoToast');
const infoMessage = document.getElementById('infoMessage');

// Score tracking
const scoreElements = {
  wins: document.getElementById('wins'),
  ties: document.getElementById('ties'),
  losses: document.getElementById('losses')
};

let scores = {
  wins: 0,
  ties: 0,
  losses: 0
};

// Load scores from localStorage
function loadScores() {
  const savedScores = localStorage.getItem('tictactoe_scores');
  if (savedScores) {
    scores = JSON.parse(savedScores);
    updateScoreDisplay();
  }
}

// Save scores to localStorage
function saveScores() {
  localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
}

// Update score display
function updateScoreDisplay() {
  scoreElements.wins.textContent = scores.wins;
  scoreElements.ties.textContent = scores.ties;
  scoreElements.losses.textContent = scores.losses;
}

// Dark mode toggle
const themeToggle = document.getElementById('themeToggle');

function applyTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  themeToggle.setAttribute('aria-pressed', String(isDark));
}

function loadTheme() {
  const savedTheme = localStorage.getItem('tictactoe_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);
}

function toggleTheme() {
  const isDark = !document.body.classList.contains('dark-mode');
  applyTheme(isDark);
  localStorage.setItem('tictactoe_theme', isDark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', toggleTheme);

// Update score based on game result
window.updateScore = function (result) {
  if (result === 'win') {
    scores.wins++;
  } else if (result === 'tie') {
    scores.ties++;
  } else if (result === 'loss') {
    scores.losses++;
  }
  updateScoreDisplay();
  saveScores();
};

// Show choice modal on load
window.onload = () => {
  loadScores();
  loadTheme();
  choice();

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered', reg))
      .catch((err) => console.log('Service Worker registration failed', err));
  }
};

function choice() {
  return new Promise((resolve) => {
    // Show modal
    choiceModal.classList.add('active');

    // Get player cards
    const playerCards = choiceModal.querySelectorAll('.player-card');

    // Handle card clicks
    const handleClick = (e) => {
      const card = e.currentTarget;
      const choice = card.dataset.choice;

      // Remove event listeners
      playerCards.forEach(c => c.removeEventListener('click', handleClick));

      // Hide modal
      choiceModal.classList.remove('active');

      // Show toast message and start game
      if (choice === 'ai') {
        showToast('AI starts first! Get ready...');
        updateStatus("AI is thinking...");
        setTimeout(() => {
          onTurn(botPicksSpot(), AI_PLAYER);
          updateStatus("Your Turn");
          isGameActive = true;
        }, 1200);
      } else {
        showToast('You start first! Make your move!');
        updateStatus("Your Turn");
        isGameActive = true;
      }

      resolve(choice);
    };

    playerCards.forEach(card => card.addEventListener('click', handleClick));
  });
}

function showToast(message) {
  infoMessage.textContent = message;
  infoToast.classList.add('active');

  setTimeout(() => {
    infoToast.classList.remove('active');
  }, 2000);
}
