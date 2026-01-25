// HTML Elements
const resetDiv = document.querySelector(".reset");
const statusDiv = document.querySelector(".status");
const cellDivs = document.querySelectorAll(".game-cell");
const container = document.querySelector(".container");

resetDiv.addEventListener("click", onResetGame);

// Game State
let origBoard;
let isGameActive = true;
const HUMAN_PLAYER = "O";
const AI_PLAYER = "X";

const winCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],

  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],

  [0, 4, 8],
  [2, 4, 6],
];

const cells = document.getElementsByClassName("game-cell");

function onResetGame() {
  // Add rotation animation
  container.classList.add('reset-animation');
  setTimeout(() => {
    container.classList.remove('reset-animation');
  }, 600);

  onStartGame();
  choice();
}

onStartGame();
function onStartGame() {
  document.querySelector(".end-game").style.display = "none";
  origBoard = Array.from(Array(9).keys());
  isGameActive = true;

  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.remove("x");
    cells[i].classList.remove("o");
    cells[i].classList.remove("won");
    cells[i].classList.remove("tie");
    cells[i].classList.remove("shake");
    cells[i].classList.remove("win-line");
    statusDiv.style.display = "none";
    resetDiv.style.display = "none";
    cells[i].addEventListener("click", onTurnClick, false);
  }
  updateStatus("Make your choice...");
}

function updateStatus(message) {
  statusDiv.style.display = "block";
  statusDiv.innerHTML = `<span>${message}</span>`;
}

function onTurnClick(e) {
  // Ignore clicks if game is not active
  if (!isGameActive) {
    return;
  }

  const { id: squareId } = e.target;

  // Check if cell is already occupied
  if (typeof origBoard[squareId] !== "number") {
    // Add shake animation for visual feedback
    e.target.classList.add("shake");
    setTimeout(() => {
      e.target.classList.remove("shake");
    }, 500);
    return;
  }

  resetDiv.style.display = "block";

  // Make human move
  onTurn(squareId, HUMAN_PLAYER);

  if (!onCheckGameTie()) {
    // Disable further clicks while AI is thinking
    isGameActive = false;
    updateStatus("AI is thinking...");

    // 800ms delay for AI move
    setTimeout(function () {
      onTurn(botPicksSpot(), AI_PLAYER);
      if (!onCheckGameTie()) {
        isGameActive = true;
        updateStatus("Your Turn");
      }
    }, 800);
  }
}

function onTurn(squareId, player) {
  origBoard[squareId] = player;

  if (player === "O") {
    document.getElementById(squareId).classList.add("o");
  } else {
    document.getElementById(squareId).classList.add("x");
  }

  let isGameWon = onCheckWin(origBoard, player);
  if (isGameWon) {
    onGameOver(isGameWon);
  }
}

function onCheckWin(board, player) {
  let plays = board.reduce((a, e, i) => {
    return e === player ? a.concat(i) : a;
  }, []);
  let gameWon = false;
  for (let [index, win] of winCombos.entries()) {
    if (win.every((elem) => plays.indexOf(elem) > -1)) {
      gameWon = {
        index: index,
        player: player,
      };
      break;
    }
  }
  return gameWon;
}

function onCheckGameTie() {
  if (emptySquares().length === 0) {
    isGameActive = false;

    for (let i = 0; i < cells.length; i++) {
      cellDivs[i].classList.add("tie");
      cells[i].removeEventListener("click", onTurnClick, false);
    }

    // Update score
    if (window.updateScore) {
      window.updateScore('tie');
    }

    onDeclareWinner("It's a Tie!");
    return true;
  }
  return false;
}
function onGameOver({ index, player }) {
  isGameActive = false;

  // Add winning line animation
  for (let i of winCombos[index]) {
    const winner = player === HUMAN_PLAYER ? "win" : "tie";
    setTimeout(() => {
      cellDivs[i].classList.add("win-line");
      if (winner == "win") {
        cellDivs[i].classList.add("won");
      } else {
        cellDivs[i].classList.add("tie");
      }
    }, i * 100); // Stagger animation
  }

  for (let i = 0; i < cells.length; i++) {
    cells[i].removeEventListener("click", onTurnClick, false);
  }

  // Update score
  const scoreResult = player === HUMAN_PLAYER ? 'win' : 'loss';
  if (window.updateScore) {
    window.updateScore(scoreResult);
  }

  const result = player === HUMAN_PLAYER ? "You Win! 🎉" : "You Lose! 😔";
  onDeclareWinner(result);
}

function onDeclareWinner(who) {
  statusDiv.style.display = "block";
  statusDiv.innerHTML = `<span>${who}</span>`;
}

/*** Bot moves ***/

function emptySquares() {
  return origBoard.filter((item) => typeof item === "number");
}

function botPicksSpot() {
  return minimax(origBoard, AI_PLAYER).index;
}

function minimax(newBoard, player) {
  let availableSpots = emptySquares();

  if (onCheckWin(newBoard, HUMAN_PLAYER)) {
    return { score: -10 };
  } else if (onCheckWin(newBoard, AI_PLAYER)) {
    return { score: 10 };
  } else if (availableSpots.length === 0) {
    return { score: 0 };
  }

  let moves = [];

  for (let i = 0; i < availableSpots.length; i++) {
    let move = {};
    move.index = newBoard[availableSpots[i]];
    newBoard[availableSpots[i]] = player;

    if (player === AI_PLAYER) {
      let result = minimax(newBoard, HUMAN_PLAYER);
      move.score = result.score;
    } else {
      let result = minimax(newBoard, AI_PLAYER);
      move.score = result.score;
    }
    newBoard[availableSpots[i]] = move.index;
    moves.push(move);
  }
  let bestMove;

  if (player === AI_PLAYER) {
    let bestScore = -10000;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score > bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  } else {
    let bestScore = 10000;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score < bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  }

  return moves[bestMove];
} // end of minimax func()
