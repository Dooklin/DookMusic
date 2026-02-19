const audioPlayer = new Audio();

let queue = [];
let currentIndex = -1;

let queueRows = [];


let scanBtn = document.getElementById("scanBtn");
let musicfiles = document.getElementById("musicfiles");

scanBtn.addEventListener("click", function(){
    musicfiles.click();
});

musicfiles.addEventListener("change", function(e) {
    let files = Array.from(e.target.files)
    
    let audioFiles = files.filter(f => f.type.startsWith("audio/"));
    let imageFiles = files.filter(f => f.type.startsWith("image/"));

    
    /* delete previous entries in songscont, leave title & placeholder */
    let songcont = document.getElementById("song-cont");
    songcont.innerHTML = "";
    tbody.innerHTML = "";
    queuecounter = 0

    let covermap = {};

    imageFiles.forEach(img => {
        let cleanname = img.name.replace(/\.[^/.]+$/, "");
        covermap[cleanname] = img;
    });

    audioFiles.forEach(file => {
        renderIndivSongs(file, songcont, covermap);
    });
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

    let artistPresent;
    if (filename.includes(" - ")) {
        artistPresent = true;
        let parts = filename.split(" - ");
        title = parts[0];
        artist = parts[1];
        
        playlistCont.innerHTML = `
        <img src="${coverURL}" alt="Song-Cover">
        <div class="playlist-text">
            <span>${title}</span>
            <span class="playlist-subtext">${artist}</span>
        </div>
        `;

    } else {
        artistPresent = false;
        playlistCont.innerHTML = `
        <img src="${coverURL}" alt="Song-Cover">
        <div class="playlist-text">
            <span>${filename}</span>
            <span class="playlist-subtext">Loading...</span>
        </div>
        `;
    }

    songcont.appendChild(playlistCont);
    
    /* needed to get duration of file */
    const tempAudio = new Audio();
    tempAudio.src = URL.createObjectURL(file);

    tempAudio.addEventListener("loadedmetadata", function() {
        const durationF = formatTime(tempAudio.duration);
        file.songDuration = formatTime(tempAudio.duration);

        if(!artistPresent) {
            playlistCont.querySelector(".playlist-subtext")
                .textContent = durationF;
        }
        URL.revokeObjectURL(tempAudio.src);
    });
    
    


    playlistCont.addEventListener("click", function(){
        queuecounter++;
        let currentNr = queuecounter;
        let currentName = file.name.replace(/\.[^/.]+$/, "");
        let currentDur = file.songDuration || "--:--";;
        addToQueue(currentNr, title || currentName, currentDur, file, artist, coverURL);
    });
}

/* queue.js */

let queuecont = document.getElementById("queue-cont");
let tbody = document.querySelector("tbody");
let queuecounter = 0;

function addToQueue(currentNr, currentName, currentDur, file, artist, coverURL) {
    queue.push({
        title: currentName,
        artist,
        duration: currentDur,
        file,
        coverURL
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td></td>
        <td>${currentName}</td>
        <td>${currentDur}</td>
        <td class="row-actions">
            <button data-action="up">▲</button>
            <button data-action="remove">✖</button>
            <button data-action="down">▼</button>
        </td>
    `;

    tbody.appendChild(tr);
    queueRows.push(tr);

    // play on row click
    tr.addEventListener("click", function () {
        const dynamicIndex = Number(tr.dataset.index);
        playByIndex(dynamicIndex);
    });

    refreshRowIndices();
}

let currentFile = null;

function playByIndex(index) {
    if (index < 0 || index >= queue.length) return;

    currentIndex = index;

    const song = queue[index];
    const fileURL = URL.createObjectURL(song.file);

    audioPlayer.src = fileURL;
    audioPlayer.play();

    updateNowPlayingHighlight();

    if (queueRows[currentIndex]) {
        queueRows[currentIndex].classList.add("now-playing");
    }

    document.querySelector("#currentcover").src = song.coverURL;

    document.querySelector("#bottom-right .playlist-text span:first-child")
        .textContent = song.title;

    document.querySelector("#bottom-right .playlist-text span:last-child")
        .textContent = song.artist || song.duration;
    
    /* middle time */
    document.querySelector("#player-control span:nth-child(3)")
        .textContent = song.duration;
    
    playimg.src = "svgs/pause.svg";
}



let volumeSlider = document.getElementById("volumeSlider");

audioPlayer.volume = volumeSlider.value;

volumeSlider.addEventListener("input", function(){
    audioPlayer.volume = this.value
});


let playbtn = document.getElementById("playBtn");
let playimg = document.getElementById("playimg");

playbtn.addEventListener("click", function() {
    if(audioPlayer.paused) {
        audioPlayer.play();
        playimg.src = "svgs/pause.svg";
    } else {
        audioPlayer.pause();
        playimg.src = "svgs/play.svg";
    }
});

let nextBtn = document.getElementById("nextBtn");
let prevBtn = document.getElementById("prevBtn");

nextBtn.addEventListener("click", function() {
    if(currentIndex < queue.length -1) {
        playByIndex(currentIndex + 1);
        playimg.src = "svgs/pause.svg";
    }
});

prevBtn.addEventListener("click", function() {
    if(currentIndex > 0) {
        playByIndex(currentIndex - 1);
        playimg.src = "svgs/pause.svg";
    }
});

audioPlayer.addEventListener("ended", function() {
    if(currentIndex < queue.length - 1) {
        playByIndex(currentIndex + 1);
        playimg.src = "svgs/pause.svg";
    }
});

let progressBar = document.getElementById("progress-bar");
let progressFill = document.getElementById("progress-bar-progress");
let currentTimeSpan = document.querySelector("#player-control span:first-child")

audioPlayer.addEventListener("timeupdate", function() {
    if(!audioPlayer.duration) return;

    let percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = percent + "%";

    currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
});

progressBar.addEventListener("click", function(e) {
    let rect = progressBar.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let width = rect.width

    let percent = clickX / width;

    audioPlayer.currentTime = percent * audioPlayer.duration;
});

document.addEventListener("keydown", function(e){
    if(e.code == "Space") {
        e.preventDefault();
        if(audioPlayer.paused) {
            audioPlayer.play();
            playimg.src = "svgs/pause.svg";
        } else {
            audioPlayer.pause();
            playimg.src = "svgs/play.svg";
        }
    }
});


function formatTime(seconds) {
    let mins = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function mock() {
    let mockbox = document.getElementById("mockbox");
    mockbox.innerHTML = "The other one...";
}

tbody.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    e.stopPropagation();

    const tr = btn.closest("tr");
    const index = Number(tr.dataset.index);
    const action = btn.dataset.action;

    if (action === "up" && index > 0) {
        swapQueue(index, index - 1);
    }

    if (action === "down" && index < queue.length - 1) {
        swapQueue(index, index + 1);
    }

    if (action === "remove") {
        removeFromQueue(index);
    }
});

function swapQueue(i, j) {
    if (i === j) return;

    [queue[i], queue[j]] = [queue[j], queue[i]];

    [queueRows[i], queueRows[j]] = [queueRows[j], queueRows[i]];

    queueRows.forEach(row => tbody.appendChild(row));

    if (currentIndex === i) {
        currentIndex = j;
    } else if (currentIndex === j) {
        currentIndex = i;
    }

    refreshRowIndices();
    updateNowPlayingHighlight();
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

        if (index >= queue.length) {
            currentIndex = queue.length - 1;
        } else {
            currentIndex = index;
        }

        playByIndex(currentIndex);
    }
    else if (index < currentIndex) {
        currentIndex--;
    }

    refreshRowIndices();
    updateNowPlayingHighlight();
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
