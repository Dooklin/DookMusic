const audioPlayer = new Audio();
window.audioPlayer = audioPlayer;

let queue = [];
let currentIndex = -1;
let queueRows = [];
let currentObjectURL = null;

let isShuffled = false;
let repeatOn = false;

let scanBtn = document.getElementById("scanBtn");
let musicfiles = document.getElementById("musicfiles");

scanBtn.addEventListener("click", function () {
    if (scanBtn.textContent === "Add All") {
        document.querySelectorAll("#song-cont .playlist-cont").forEach(card => card.click());
    } else {
        musicfiles.click();
    }
});

musicfiles.addEventListener("change", function (e) {
    scanBtn.textContent = "Add New";

    let files = Array.from(e.target.files);

    let audioFiles = files.filter(f => f.type.startsWith("audio/"));
    let imageFiles = files.filter(f => f.type.startsWith("image/"));

    let songcont = document.getElementById("song-cont");
    songcont.innerHTML = "";
    tbody.innerHTML = "";
    queue = [];
    queueRows = [];
    currentIndex = -1;

    let covermap = {};
    imageFiles.forEach(img => {
        let cleanname = img.name.replace(/\.[^/.]+$/, "");
        covermap[cleanname] = img;
    });

    audioFiles.forEach(file => {
        renderIndivSongs(file, songcont, covermap);
    });

    scanBtn.textContent = "Add All";
});

function renderIndivSongs(file, songcont, covermap) {
    let playlistCont = document.createElement("div");
    playlistCont.classList.add("playlist-cont");

    let filename = file.name.replace(/\.[^/.]+$/, "");
    let title = filename;
    let artist = "";

    let coverURL = "default.png";
    if (covermap[filename]) {
        coverURL = URL.createObjectURL(covermap[filename]);
    }

    let artistPresent = filename.includes(" - ");
    if (artistPresent) {
        let parts = filename.split(" - ");
        title = parts[0];
        artist = parts[1];

        playlistCont.innerHTML = `
        <img src="${coverURL}" alt="Song-Cover">
        <div class="playlist-text">
            <span>${title}</span>
            <span class="playlist-subtext">${artist}</span>
        </div>`;
    } else {
        playlistCont.innerHTML = `
        <img src="${coverURL}" alt="Song-Cover">
        <div class="playlist-text">
            <span>${filename}</span>
            <span class="playlist-subtext">Loading...</span>
        </div>`;
    }

    songcont.appendChild(playlistCont);

    const tempAudio = new Audio();
    tempAudio.src = URL.createObjectURL(file);
    tempAudio.addEventListener("loadedmetadata", function () {
        const durationF = formatTime(tempAudio.duration);
        file.songDuration = durationF;
        if (!artistPresent) {
            playlistCont.querySelector(".playlist-subtext").textContent = durationF;
        }
        URL.revokeObjectURL(tempAudio.src);
    });

    playlistCont.addEventListener("click", function () {
        let currentName = title || filename;
        let currentDur = file.songDuration || "--:--";
        addToQueue(currentName, currentDur, file, artist, coverURL);
    });
}

/* queue */

let queuecont = document.getElementById("queue-cont");
let tbody = document.querySelector("tbody");

function addToQueue(currentName, currentDur, file, artist, coverURL) {
    queue.push({ title: currentName, artist, duration: currentDur, file, coverURL });

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td></td>
        <td>${currentName}</td>
        <td>${currentDur}</td>
        <td class="row-actions">
            <button data-action="up">▲</button>
            <button data-action="remove">✖</button>
            <button data-action="down">▼</button>
        </td>`;

    tbody.appendChild(tr);
    queueRows.push(tr);

    tr.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        playByIndex(Number(tr.dataset.index));
    });

    refreshRowIndices();
    updateQueueDuration();
}

function playByIndex(index) {
    if (index < 0 || index >= queue.length) return;

    currentIndex = index;
    const song = queue[index];

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
    }
    currentObjectURL = URL.createObjectURL(song.file);

    audioPlayer.src = currentObjectURL;
    audioPlayer.play();

    updateNowPlayingHighlight();

    document.querySelector("#currentcover").src = song.coverURL;
    document.querySelector("#bottom-right .playlist-text span:first-child").textContent = song.title;
    document.querySelector("#bottom-right .playlist-text span:last-child").textContent = song.artist || song.duration;
    document.querySelector("#player-control span:nth-child(3)").textContent = song.duration;

    playimg.src = "svgs/pause.svg";
    /* goofi idea */
    /*document.querySelector("main").style.backgroundImage = `url(${song.coverURL})`;*/
}

/* volume */

let volumeSlider = document.getElementById("volumeSlider");
audioPlayer.volume = volumeSlider.value;
volumeSlider.addEventListener("input", function () {
    audioPlayer.volume = this.value;
});

let volumeSliderMob = document.getElementById("mobile-settings-control");
audioPlayer.volume = volumeSliderMob.value;
volumeSliderMob.addEventListener("input", function () {
    audioPlayer.volume = this.value;
});

/* play/pause */

let playbtn = document.getElementById("playBtn");
let playimg = document.getElementById("playimg");

playbtn.addEventListener("click", function () {
    if (audioPlayer.paused) {
        audioPlayer.play();
        playimg.src = "svgs/pause.svg";
    } else {
        audioPlayer.pause();
        playimg.src = "svgs/play.svg";
    }
});

/* prev / next */

let nextBtn = document.getElementById("nextBtn");
let prevBtn = document.getElementById("prevBtn");

nextBtn.addEventListener("click", function () {
    playNext();
});

prevBtn.addEventListener("click", function () {
    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
        return;
    }
    if (currentIndex > 0) {
        playByIndex(currentIndex - 1);
    }
});

audioPlayer.addEventListener("ended", function () {
    playNext();
});

function playNext() {
    if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        playByIndex(randomIndex);
        return;
    }
    if (repeatOn && currentIndex === queue.length - 1) {
        playByIndex(0);
    } else if (currentIndex < queue.length - 1) {
        playByIndex(currentIndex + 1);
    }
}

/* progress bar */

let progressBar = document.getElementById("progress-bar");
let progressFill = document.getElementById("progress-bar-progress");
let currentTimeSpan = document.querySelector("#player-control span:first-child");

audioPlayer.addEventListener("timeupdate", function () {
    if (!audioPlayer.duration) return;
    let percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = percent + "%";
    currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
});

progressBar.addEventListener("click", function (e) {
    let rect = progressBar.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
});

/* spacebar */

document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (audioPlayer.paused) {
            audioPlayer.play();
            playimg.src = "svgs/pause.svg";
        } else {
            audioPlayer.pause();
            playimg.src = "svgs/play.svg";
        }
    }
});

/* shuffle */

let shuffleBtn = document.getElementById("shuffleBtn");
shuffleBtn.addEventListener("click", function () {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle("active", isShuffled);
});

/* repeat */

let repeatBtn = document.getElementById("repeatBtn");
repeatBtn.addEventListener("click", function () {
    repeatOn = !repeatOn;
    repeatBtn.classList.toggle("active", repeatOn);
});

/* queue row actions */

tbody.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    e.stopPropagation();

    const tr = btn.closest("tr");
    const index = Number(tr.dataset.index);
    const action = btn.dataset.action;

    if (action === "up" && index > 0) swapQueue(index, index - 1);
    if (action === "down" && index < queue.length - 1) swapQueue(index, index + 1);
    if (action === "remove") removeFromQueue(index);
});

function swapQueue(i, j) {
    [queue[i], queue[j]] = [queue[j], queue[i]];
    [queueRows[i], queueRows[j]] = [queueRows[j], queueRows[i]];
    queueRows.forEach(row => tbody.appendChild(row));

    if (currentIndex === i) currentIndex = j;
    else if (currentIndex === j) currentIndex = i;

    refreshRowIndices();
    updateNowPlayingHighlight();
    updateQueueDuration();
}

function removeFromQueue(index) {
    if (index < 0 || index >= queue.length) return;

    const wasPlaying = index === currentIndex;

    queue.splice(index, 1);
    const removedRow = queueRows.splice(index, 1)[0];
    if (removedRow) removedRow.remove();

    if (wasPlaying) {
        if (queue.length === 0) {
            audioPlayer.pause();
            currentIndex = -1;
            updateNowPlayingHighlight();
            return;
        }
        currentIndex = index >= queue.length ? queue.length - 1 : index;
        playByIndex(currentIndex);
    } else if (index < currentIndex) {
        currentIndex--;
    }

    refreshRowIndices();
    updateNowPlayingHighlight();
    updateQueueDuration();
}

function updateNowPlayingHighlight() {
    queueRows.forEach((row, i) => {
        row.classList.toggle("now-playing", i === currentIndex);
    });
}

function refreshRowIndices() {
    queueRows.forEach((row, i) => {
        row.dataset.index = i;
        row.children[0].textContent = i + 1;
    });
}

function updateQueueDuration() {
    const total = queue.reduce((sum, song) => {
        if (!song.duration || song.duration === "--:--") return sum;
        const [m, s] = song.duration.split(":").map(Number);
        return sum + m * 60 + s;
    }, 0);
    const el = document.getElementById("queue-duration");
    if (el) el.textContent = total > 0 ? formatTime(total) : "";
}

function formatTime(seconds) {
    let mins = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

window.addEventListener("beforeunload", function (event) {
    event.preventDefault();
    event.returnValue = "";
});

/*
maybe todo

- full queue and how long for full queue duration
- volume slider, check for safari/chrome/firefox then chrome left 50%, firefox leave it with calc
- if 3 line breaks at card then font smaller

- if mp4 just get the audio?

tests conclude

Add all button
Left rigtt swipe fix for apple
Di i ecen need a numbering
*/