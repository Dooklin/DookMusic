let sidebar = document.getElementById("tutorial");
let middleCont = document.getElementById("middle-cont");

function hide() {
    sidebar.style.display = "none";
    middleCont.style.width = "65%";
}

function mock() {
    let mockbox = document.getElementById("mockbox");
    mockbox.innerHTML = "The other one...";
}
