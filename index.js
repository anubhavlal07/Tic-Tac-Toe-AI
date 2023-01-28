window.onload = choice();

function choice() {
  swal("Who plays first ?", {
    buttons: {
      cancel: "Human",
      catch: {
        text: "Machine",
        value: "ai",
      },
    },
    timer: 5000,
  }).then((value) => {
    if (value === "ai") {
      swal("You preferred AI", {
        buttons: false,
        timer: 800,
      });
      onTurn(botPicksSpot(), AI_PLAYER);
    } else {
      swal("You preferred human", {
        buttons: false,
        timer: 800,
      });
    }
  });
}

// Disabled Input from keyboard
// (document.onkeydown = function (event) {
//   if (event.keyCode == 123) {
//     return false;
//   } else if (event.ctrlKey && event.shiftKey && event.keyCode == 73) {
//     return false;
//   } else if (event.ctrlKey && event.shiftKey && event.keyCode == 67) {
//     return false;
//   } else if (event.ctrlKey && event.shiftKey && event.keyCode == 86) {
//     return false;
//   } else if (event.ctrlKey && event.shiftKey && event.keyCode == 117) {
//     return false;
//   } else if (event.ctrlKey && event.keyCode == 85) {
//     return false;
//   }
// }),
//   false;

// if (document.addEventListener) {
//   document.addEventListener(
//     "contextmenu",
//     function (e) {
//       e.preventDefault();
//     },
//     false
//   );
// } else {
//   document.attachEvent("oncontextmenu", function () {
//     window.event.returnValue = false;
//   });
// }
