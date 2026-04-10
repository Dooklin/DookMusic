let songCont = document.getElementById("song-cont");
let queueCont = document.getElementById("middle-cont");
let leftdot = document.getElementById("left-dot");
let rightdot = document.getElementById("right-dot");
let main = document.querySelector("main");

let currentWindow = 0;

function goTo(index) {
  currentWindow = index;

  document.querySelectorAll(".main-conts").forEach(el => {
    el.style.transform = `translateX(${index === 1 ? "-100vw" : "0"})`;
  });
  leftdot.classList.toggle("active", index === 0);
  rightdot.classList.toggle("active", index === 1);
}

leftdot.addEventListener("click", function() {
  if (currentWindow === 0) return;
  goTo(0);
});

rightdot.addEventListener("click", function() {
  if (currentWindow === 1) return;
  goTo(1);
});

goTo(0);

let touchStartX = 0;

const isMobile = () => window.matchMedia("(max-width: 1000px)").matches;

main.addEventListener("touchstart", function(e) {
    if (!isMobile()) return;
    touchStartX = e.touches[0].clientX;

    if (currentWindow === 0 && touchStartX < 30) {
        e.preventDefault();
    }
}, { passive: false });

main.addEventListener("touchend", function(e) {
  if (!isMobile()) return;
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 50) return;
  if (diff > 0 && currentWindow === 0) goTo(1);
  if (diff < 0 && currentWindow === 1) goTo(0);
});

const isSmallMobile = () => window.matchMedia("(max-width: 480px)").matches;
var dur = document.getElementById("dur");

function updateDurText() {
  if (isSmallMobile()) {
    dur.innerHTML = "Dur";
  } else {
    dur.innerHTML = "Duration";
  }
}

updateDurText();

window.addEventListener("resize", updateDurText);
