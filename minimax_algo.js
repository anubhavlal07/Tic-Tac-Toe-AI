// HTML Elements
const resetDiv = document.querySelector(".reset");
const statusDiv = document.querySelector(".status");
const cellDivs = document.querySelectorAll(".game-cell");

// Temp Sections Above
let origBoard;
const HUMAN_PLAYER = "X";
const AI_PLAYER = "O";

resetDiv.addEventListener("click", onStartGame);

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
onStartGame();

function onStartGame() {
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
    cells[i].addEventListener("click", onTurnClick, false);
  }
}

function onTurnClick(e) {
  // console.log(e.target.id);
  const { id: squareId } = e.target;
  if (typeof origBoard[squareId] === "number") {
    onTurn(squareId, HUMAN_PLAYER);
    if (!onCheckGameTie()) {
      onTurn(botPicksSpot(), AI_PLAYER);
    }
  }
}

function onTurn(squareId, player) {
  origBoard[squareId] = player;
  console.log(player);
  if (player === "X") {
    document.getElementById(squareId).classList.add("x");
  } else {
    // Setting a delay of .8 seconds
    setTimeout(function () {
      document.getElementById(squareId).classList.add("o");
    }, 800);
  }

  let isGameWon = onCheckWin(origBoard, player);
  // console.log(isGameWon)
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
      location.reload();
    }, 300);
    return true;
  } else {
    return false;
  }
}
function onGameOver({ index, player }) {
  for (let i of winCombos[index]) {
    const winner = player === HUMAN_PLAYER ? "win" : "tie";
    if (winner == "win") {
      cellDivs[i].classList.add("won");
    } else {
      setTimeout(function () {
        cellDivs[i].classList.add("tie");
      }, 850);
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
  setTimeout(function () {
    statusDiv.style.display = "block";
    statusDiv.innerHTML = `<span>${who}</span>`;
  }, 850);
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
    } // end of if/else block

    newBoard[availableSpots[i]] = move.index;
    moves.push(move);
  } // end of for loop

  let bestMove;

  if (player === AI_PLAYER) {
    let bestScore = -10000;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].score > bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    } // end of for loop
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
// Disabled Input from keyboard
(document.onkeydown = function (event) {
  if (event.keyCode == 123) {
    return false;
  } else if (event.ctrlKey && event.shiftKey && event.keyCode == 73) {
    return false;
  } else if (event.ctrlKey && event.shiftKey && event.keyCode == 67) {
    return false;
  } else if (event.ctrlKey && event.shiftKey && event.keyCode == 86) {
    return false;
  } else if (event.ctrlKey && event.shiftKey && event.keyCode == 117) {
    return false;
  } else if (event.ctrlKey && event.keyCode == 85) {
    return false;
  }
}),
  false;

if (document.addEventListener) {
  document.addEventListener(
    "contextmenu",
    function (e) {
      e.preventDefault();
    },
    false
  );
} else {
  document.attachEvent("oncontextmenu", function () {
    window.event.returnValue = false;
  });
}