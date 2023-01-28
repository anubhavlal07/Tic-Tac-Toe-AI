// HTML Elements
const resetDiv = document.querySelector(".reset");
const statusDiv = document.querySelector(".status");
const cellDivs = document.querySelectorAll(".game-cell");

resetDiv.addEventListener("click", onResetGame);

// Temp Sections Above
let origBoard;
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
  onStartGame();
  choice();
}

onStartGame();
function onStartGame() {
  console.clear();
  // console.log('Starting Game');
  document.querySelector(".end-game").style.display = "none";
  origBoard = Array.from(Array(9).keys());
  // console.table(origBoard);
  // console.log(cells);
  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.remove("x");
    cells[i].classList.remove("o");
    cells[i].classList.remove("won");
    cells[i].classList.remove("tie");
    statusDiv.style.display = "none";
    resetDiv.style.display = "none";
    cells[i].addEventListener("click", onTurnClick, false);
  }
  // onTurn(botPicksSpot(), AI_PLAYER); // remove this if player wants to start first
}

function onTurnClick(e) {
  resetDiv.style.display = "block";
  console.log(e.target.id);
  const { id: squareId } = e.target;
  if (typeof origBoard[squareId] === "number") {
    onTurn(squareId, HUMAN_PLAYER);
    if (!onCheckGameTie()) {
      // 0.8 sec delay
      setTimeout(function () {
        onTurn(botPicksSpot(), AI_PLAYER);
        onCheckGameTie();
      }, 800);
    }
  }
}

function onTurn(squareId, player) {
  origBoard[squareId] = player;
  console.log(player);
  if (player === "O") {
    document.getElementById(squareId).classList.add("o");
  } else {
    document.getElementById(squareId).classList.add("x");
  }

  let isGameWon = onCheckWin(origBoard, player);
  // console.log(isGameWon);
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
    for (let i = 0; i < cells.length; i++) {
      cellDivs[i].classList.add("tie");
      cells[i].removeEventListener("click", onTurnClick, false);
    }
    onDeclareWinner("A Tie");
    setTimeout(function () {
      onResetGame();
    }, 800);
    return true;
  }
  return false;
}
function onGameOver({ index, player }) {
  for (let i of winCombos[index]) {
    const winner = player === HUMAN_PLAYER ? "win" : "tie";
    if (winner == "win") {
      cellDivs[i].classList.add("won");
    } else {
      cellDivs[i].classList.add("tie");
    }
  }
  for (let i = 0; i < cells.length; i++) {
    cells[i].removeEventListener("click", onTurnClick, false);
  }

  const result = player === HUMAN_PLAYER ? "You Win" : "You Lose";
  onDeclareWinner(result);
}

function onDeclareWinner(who) {
  // console.log('Result: ', who);
  // document.querySelector(".end-game").style.display = "block";
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
