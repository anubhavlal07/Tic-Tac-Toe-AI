// Custom Game Modal Functions
const choiceModal = document.getElementById('choiceModal');
const infoToast = document.getElementById('infoToast');
const infoMessage = document.getElementById('infoMessage');

// Show choice modal on load
window.onload = () => {
  choice();
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
