const audioPlayer = new Audio();
window.audioPlayer = audioPlayer;

let queue = [];
let currentIndex = -1;
let queueRows = [];
let currentObjectURL = null;

let isShuffled = false;
let repeatOn = false;

/* db */

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("DookMusicDB", 2);
        req.onupgradeneeded = function (e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("songs")) db.createObjectStore("songs", { keyPath: "name" });
            if (!db.objectStoreNames.contains("covers")) db.createObjectStore("covers", { keyPath: "name" });
            if (!db.objectStoreNames.contains("playlists")) db.createObjectStore("playlists", { keyPath: "id" });
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function saveFilesToIDB(audioFiles, imageFiles, playlistId) {
    const tx = db.transaction(["songs", "covers"], "readwrite");
    audioFiles.forEach(f => tx.objectStore("songs").put({ name: f.name, file: f, playlistId }));
    imageFiles.forEach(f => tx.objectStore("covers").put({ name: f.name, file: f, playlistId }));
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function clearIDB() {
    const tx = db.transaction(["songs", "covers", "playlists"], "readwrite");
    tx.objectStore("songs").clear();
    tx.objectStore("covers").clear();
    tx.objectStore("playlists").clear();
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

function getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function savePlaylistsToDB(playlists) {
    const tx = db.transaction("playlists", "readwrite");
    const store = tx.objectStore("playlists");
    store.clear();
    playlists.forEach(p => store.put(p));
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

/* playlist */

let playlists = [];
let activePlaylistId = "default";

function renderPlaylistTabs() {
    const tabsEl = document.getElementById("playlist-tabs");
    tabsEl.innerHTML = "";

    playlists.forEach(pl => {
        const tab = document.createElement("div");
        tab.classList.add("playlist-tab");
        if (pl.id === activePlaylistId) tab.classList.add("active-tab");

        const nameSpan = document.createElement("span");
        nameSpan.textContent = pl.name;
        nameSpan.addEventListener("click", () => switchPlaylist(pl.id));
        tab.appendChild(nameSpan);

        tabsEl.appendChild(tab);
    });
}

async function switchPlaylist(id) {
    activePlaylistId = id;
    renderPlaylistTabs();

    const songcont = document.getElementById("song-cont");
    songcont.innerHTML = "";

    const allSongs = await getAllFromStore("songs");
    const allCovers = await getAllFromStore("covers");

    const covermap = {};
    allCovers.filter(c => c.playlistId === id).forEach(entry => {
        const cleanname = entry.file.name.replace(/\.[^/.]+$/, "");
        covermap[cleanname] = entry.file;
    });

    allSongs.filter(s => s.playlistId === id).forEach(entry => {
        renderIndivSongs(entry.file, songcont, covermap);
    });

    const pl = playlists.find(p => p.id === id);
    document.getElementById("songs-heading").textContent = pl ? pl.name : "Your Songs";
}

async function deletePlaylist(id) {
    playlists = playlists.filter(p => p.id !== id);
    await savePlaylistsToDB(playlists);

    const allSongs = await getAllFromStore("songs");
    const allCovers = await getAllFromStore("covers");
    const tx = db.transaction(["songs", "covers"], "readwrite");
    allSongs.filter(s => s.playlistId === id).forEach(s => tx.objectStore("songs").delete(s.name));
    allCovers.filter(c => c.playlistId === id).forEach(c => tx.objectStore("covers").delete(c.name));

    if (activePlaylistId === id) activePlaylistId = "default";
    renderPlaylistTabs();
    await switchPlaylist(activePlaylistId);
}

/* load shit */

async function loadFromIDB() {
    const savedSongs = await getAllFromStore("songs");
    const savedCovers = await getAllFromStore("covers");

    if (savedSongs.length === 0) return;

    const songcont = document.getElementById("song-cont");
    songcont.innerHTML = "";

    const covermap = {};
    savedCovers.filter(c => c.playlistId === activePlaylistId).forEach(entry => {
        const cleanname = entry.file.name.replace(/\.[^/.]+$/, "");
        covermap[cleanname] = entry.file;
    });

    savedSongs.filter(s => s.playlistId === activePlaylistId).forEach(entry => {
        renderIndivSongs(entry.file, songcont, covermap);
    });
}

openDB().then(async database => {
    db = database;

    const savedPlaylists = await getAllFromStore("playlists");
    if (savedPlaylists.length === 0) {
        playlists = [{ id: "default", name: "Your Songs" }];
        await savePlaylistsToDB(playlists);
    } else {
        playlists = savedPlaylists;
        if (!playlists.find(p => p.id === "default")) {
            playlists.unshift({ id: "default", name: "Your Songs" });
            await savePlaylistsToDB(playlists);
        }
    }

    renderPlaylistTabs();
    loadFromIDB();
});

/* dropdown */

const menuBtn = document.getElementById("menuBtn");
const dropdown = document.getElementById("songs-dropdown");

menuBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    dropdown.classList.toggle("dropdown-hidden");
});

document.addEventListener("click", function () {
    dropdown.classList.add("dropdown-hidden");
});

document.getElementById("addAllBtn").addEventListener("click", function () {
    dropdown.classList.add("dropdown-hidden");
    document.querySelectorAll("#song-cont .playlist-cont").forEach(card => card.click());
});

const morefiles = document.getElementById("morefiles");
document.getElementById("addMoreBtn").addEventListener("click", function () {
    dropdown.classList.add("dropdown-hidden");
    morefiles.click();
});

morefiles.addEventListener("change", async function (e) {
    const files = Array.from(e.target.files);
    const audioFiles = files.filter(f => f.type.startsWith("audio/"));
    const imageFiles = files.filter(f => f.type.startsWith("image/"));

    const covermap = {};
    imageFiles.forEach(img => {
        const cleanname = img.name.replace(/\.[^/.]+$/, "");
        covermap[cleanname] = img;
    });

    await saveFilesToIDB(audioFiles, imageFiles, activePlaylistId);

    const songcont = document.getElementById("song-cont");
    audioFiles.forEach(file => renderIndivSongs(file, songcont, covermap));

    morefiles.value = "";
});

document.getElementById("newPlaylistBtn").addEventListener("click", function () {
    dropdown.classList.add("dropdown-hidden");
    showPlaylistDialog();
});

document.getElementById("deletePlaylistBtn").addEventListener("click", async function () {
    dropdown.classList.add("dropdown-hidden");
    if (activePlaylistId === "default") {
        alert("Can't delete Your Songs!");
        return;
    }
    const pl = playlists.find(p => p.id === activePlaylistId);
    if (!confirm(`Delete playlist "${pl?.name}"? This cannot be undone.`)) return;
    await deletePlaylist(activePlaylistId);
});

document.getElementById("deleteAllBtn").addEventListener("click", async function () {
    dropdown.classList.add("dropdown-hidden");
    if (!confirm("Delete everything? This cannot be undone.")) return;

    await clearIDB();
    playlists = [{ id: "default", name: "Your Songs" }];
    activePlaylistId = "default";
    await savePlaylistsToDB(playlists);

    document.getElementById("song-cont").innerHTML = "";
    queue = [];
    queueRows = [];
    currentIndex = -1;
    tbody.innerHTML = "";
    audioPlayer.pause();
    renderPlaylistTabs();
    document.getElementById("songs-heading").textContent = "Your Songs";
    updateQueueDuration();
});

/* new playlist */

function showPlaylistDialog() {
    const dialog = document.getElementById("playlist-dialog");
    document.getElementById("playlist-name-input").value = "";
    dialog.style.display = "flex";
    document.getElementById("playlist-name-input").focus();
}

document.getElementById("playlist-dialog-cancel").addEventListener("click", function () {
    document.getElementById("playlist-dialog").style.display = "none";
});

document.getElementById("playlist-dialog-confirm").addEventListener("click", async function () {
    const name = document.getElementById("playlist-name-input").value.trim();
    if (!name) return;
    const id = "pl_" + Date.now();
    playlists.push({ id, name });
    await savePlaylistsToDB(playlists);
    document.getElementById("playlist-dialog").style.display = "none";
    renderPlaylistTabs();
    switchPlaylist(id);
});

document.getElementById("playlist-name-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("playlist-dialog-confirm").click();
    if (e.key === "Escape") document.getElementById("playlist-dialog-cancel").click();
});

/* render songs */

async function renderIndivSongs(file, songcont, covermap) {
    let playlistCont = document.createElement("div");
    playlistCont.classList.add("playlist-cont");

    let filename = file.name.replace(/\.[^/.]+$/, "");
    let title = filename;
    let artist = "";

    let coverURL = "default.png";
    if (covermap[filename]) {
        coverURL = await cropToSquare(covermap[filename]);
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

    const titleSpan = playlistCont.querySelector(".playlist-text span:first-child");
    const textDiv = playlistCont.querySelector(".playlist-text");

    document.fonts.ready.then(() => {
        if (textDiv.scrollHeight > playlistCont.clientHeight) {
            titleSpan.style.fontSize = "1.1em";
        }
    });

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

    if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
    currentObjectURL = URL.createObjectURL(song.file);

    audioPlayer.src = currentObjectURL;
    audioPlayer.play();

    updateNowPlayingHighlight();

    document.querySelector("#currentcover").src = song.coverURL;
    document.querySelector("#bottom-right .playlist-text span:first-child").textContent = song.title;
    document.querySelector("#bottom-right .playlist-text span:last-child").textContent = song.artist || song.duration;
    document.querySelector("#player-control span:nth-child(3)").textContent = song.duration;
    document.title = song.title + " - DookMusic";

    playimg.src = "svgs/pause.svg";
}

/* volume */

let volumeSlider = document.getElementById("volumeSlider");
audioPlayer.volume = volumeSlider.value;
volumeSlider.addEventListener("input", function () { audioPlayer.volume = this.value; });

let volumeSliderMob = document.getElementById("mobile-settings-control");
audioPlayer.volume = volumeSliderMob.value;
volumeSliderMob.addEventListener("input", function () { audioPlayer.volume = this.value; });

/* play/pause */

let playbtn = document.getElementById("playBtn");
let playimg = document.getElementById("playimg");

playbtn.addEventListener("click", function () {
    if (audioPlayer.paused) {
        audioPlayer.play();
        playimg.src = "svgs/pause.svg";
        document.title = queue[currentIndex]?.title + " - DookMusic";
    } else {
        audioPlayer.pause();
        playimg.src = "svgs/play.svg";
        document.title = "DookMusic";
    }
});

/* prev/next */

let nextBtn = document.getElementById("nextBtn");
let prevBtn = document.getElementById("prevBtn");

nextBtn.addEventListener("click", () => playNext());
prevBtn.addEventListener("click", function () {
    if (audioPlayer.currentTime > 3) { audioPlayer.currentTime = 0; return; }
    if (currentIndex > 0) playByIndex(currentIndex - 1);
});

audioPlayer.addEventListener("ended", () => playNext());

function playNext() {
    if (isShuffled) {
        playByIndex(Math.floor(Math.random() * queue.length));
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
    audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * audioPlayer.duration;
});

/* spacebar pause/play */

document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (audioPlayer.paused) {
            audioPlayer.play();
            playimg.src = "svgs/pause.svg";
            document.title = queue[currentIndex]?.title + " - DookMusic";
        } else {
            audioPlayer.pause();
            playimg.src = "svgs/play.svg";
            document.title = "DookMusic";
        }
    }
});

/* shuffle/repeat */

let shuffleBtn = document.getElementById("shuffleBtn");
shuffleBtn.addEventListener("click", function () {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle("active", isShuffled);
});

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
    queueRows.forEach((row, i) => row.classList.toggle("now-playing", i === currentIndex));
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

/* random bs */

function formatTime(seconds) {
    let mins = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function cropToSquare(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        img.onload = function () {
            const size = Math.min(img.width, img.height);
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png"));
        };
        img.src = url;
    });
}
/*
window.addEventListener("beforeunload", function (event) {
    event.preventDefault();
    event.returnValue = "";
});
*/