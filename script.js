// ===== GLOBAL STATE =====
const appState = {
  songs: {},          // { id: songObject }
  playlists: {},      // { playlistId: { name, songIds: [] } }
  queue: [],
  currentSongId: null,
  currentPlaylistId: null
};


const player = new Audio();
player.volume = 1;

// ===== DOM REFERENCES =====
const scanBtn = document.getElementById("scanBtn");
const musicInput = document.getElementById("musicInput");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const volumeSlider = document.getElementById("volumeSlider");

const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-bar-progress");

const currentSongContainer = document.querySelector("#current-song .playlist-text span");
const currentArtistContainer = document.querySelector("#current-song .playlist-subtext");

const songsTable = document.querySelector(".middle .songs-cont table");

// ===== FILE SCAN =====
scanBtn.addEventListener("click", () => musicInput.click());

musicInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files)
    .filter(file => file.type.startsWith("audio/"));

  files.forEach(file => {
    const song = {
      id: crypto.randomUUID(),
      name: file.name,
      file: file,
      url: URL.createObjectURL(file)
      /* maybe sum get artist name or something in here, maybe cover aswell... */
    };

    appState.songs.push(song);
  });

  renderSongTable();
});

// ===== RENDER SONG TABLE =====
function renderSongTable() {
  songsTable.querySelectorAll("tbody tr").forEach(row => row.remove());

  appState.songs.forEach((song, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${song.name}</td>
      <td>--:--</td>
      <td>+</td>
    `;

    // Click row = play immediately
    row.addEventListener("click", () => {
      playSong(index);
    });

    // "+" = add to queue
    row.children[3].addEventListener("click", (e) => {
      e.stopPropagation();
      addToQueue(index);
    });

    songsTable.appendChild(row);
  });
}

// ===== PLAYBACK =====
function playSong(index) {
  const song = appState.songs[index];
  if (!song) return;

  appState.currentIndex = index;

  player.src = song.url;
  player.play();

  currentSongContainer.textContent = song.name;
  currentArtistContainer.textContent = "Local File";
}

function togglePlay() {
  if (player.paused) player.play();
  else player.pause();
}

function nextSong() {
  if (appState.queue.length > 0) {
    const nextIndex = appState.queue.shift();
    playSong(nextIndex);
    renderQueue();
  } else {
    let next = appState.currentIndex + 1;
    if (next >= appState.songs.length) next = 0;
    playSong(next);
  }
}

function prevSong() {
  let prev = appState.currentIndex - 1;
  if (prev < 0) prev = appState.songs.length - 1;
  playSong(prev);
}

player.addEventListener("ended", nextSong);

// ===== QUEUE =====
function addToQueue(index) {
  appState.queue.push(index);
  renderQueue();
}

function renderQueue() {
  const queueTable = document.querySelectorAll(".songs-cont table")[1];

  queueTable.querySelectorAll("tbody tr").forEach(row => row.remove());

  appState.queue.forEach((index, i) => {
    const song = appState.songs[index];
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${song.name}</td>
      <td>--:--</td>
      <td>x</td>
    `;

    // Remove from queue
    row.children[3].addEventListener("click", () => {
      appState.queue.splice(i, 1);
      renderQueue();
    });

    queueTable.appendChild(row);
  });
}

// ===== PLAYER CONTROLS =====
playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);

volumeSlider.addEventListener("input", () => {
  player.volume = volumeSlider.value;
});

// ===== PROGRESS BAR =====
player.addEventListener("timeupdate", () => {
  const percent = (player.currentTime / player.duration) * 100;
  progressFill.style.width = percent + "%";
});

progressBar.addEventListener("click", (e) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const percent = clickX / width;
  player.currentTime = percent * player.duration;
});

function saveState() {
  localStorage.setItem("dookmusic", JSON.stringify(appState));
}

function matchExistingSongs(file) {
  const existing = Object.values(appState.songs)
    .find(s => s.fileName === file.name);

  if (existing) {
    existing.url = URL.createObjectURL(file);
    return existing.id;
  }

  const id = crypto.randomUUID();
  appState.songs[id] = {
    id,
    name: file.name,
    fileName: file.name,
    duration: 0,
    artist: "Unknown",
    cover: null,
    url: URL.createObjectURL(file)
  };

  return id;
}

function showContextMenu(e, songId) {
  const menu = document.createElement("div");
  menu.classList.add("context-menu");

  menu.style.top = e.pageY + "px";
  menu.style.left = e.pageX + "px";

  menu.innerHTML = `
    <div data-action="queue">Add to Queue</div>
    <div data-action="playlist">Add to Playlist</div>
    <div data-action="remove">Remove from Playlist</div>
  `;

  document.body.appendChild(menu);

  menu.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    handleMenuAction(action, songId);
    menu.remove();
  });

  document.addEventListener("click", () => menu.remove(), { once: true });
}

function moveQueueItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= appState.queue.length) return;

  [appState.queue[index], appState.queue[newIndex]] =
  [appState.queue[newIndex], appState.queue[index]];

  renderQueue();
}

/*
jsmediatags.read(file, {
  onSuccess: function(tag) {
    const picture = tag.tags.picture;
    if (picture) {
      let base64 = "";
      picture.data.forEach(byte => {
        base64 += String.fromCharCode(byte);
      });
      const image = `data:${picture.format};base64,${btoa(base64)}`;
      song.cover = image;
    }
  }
});

*/
player.addEventListener("loadedmetadata", () => {
  const duration = player.duration;
});

const audio = document.createElement("audio");
audio.src = song.url;

audio.addEventListener("loadedmetadata", () => {
  song.duration = audio.duration;
  renderSongTable();
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function openPlaylist(playlistId) {
  appState.currentPlaylistId = playlistId;

  const playlist = appState.playlists[playlistId];

  document.querySelector(".middle-text-cont span")
    .textContent = playlist.name;

  document.querySelector(".main-subtext")
    .textContent = playlist.songIds.length + " Songs";

  renderPlaylistSongs(playlist.songIds);
}

function createPlaylist(name) {
  const id = crypto.randomUUID();

  appState.playlists[id] = {
    id,
    name,
    songIds: []
  };

  saveState();
  renderPlaylists();
}
