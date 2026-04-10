document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("visualizer");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (!window.audioPlayer) {
        console.warn("audioPlayer not found on window");
        return;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(window.audioPlayer);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    function unlockAudioContext() {
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
    }

    document.addEventListener("click", unlockAudioContext, { once: true });

    function draw() {
        requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const barCount = 60;
        const step = Math.floor(bufferLength / barCount);
        const maxHeight = canvas.height * 0.9;

        const barWidth = 6;
        const spacing = 4;

        for (let i = 0; i < barCount; i++) {

            const value = dataArray[i * step];
            const percent = value / 255;
            const height = percent * maxHeight;

            const r = 179 + value;
            const g = 85;
            const b = 23 - value / 2;
            const a = 0.4 + percent * 0.3;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;

            const x = i * (barWidth + spacing);

            ctx.fillRect(
                centerX + x,
                canvas.height - height,
                barWidth,
                height
            );

            ctx.fillRect(
                centerX - x - barWidth,
                canvas.height - height,
                barWidth,
                height
            );
        }
    }

    draw();
});

let vis = document.getElementById("visualizer");
let visIcon = document.getElementById("vis-toggle-icon");

function hidevis() {
    vis.classList.toggle("hidden");
    if(visIcon.src == "svgs/vis.svg"){
        visIcon.src = "svgs/vizNo.svg";
    } else {
        visIcon.src = "svgs/vis.svg"
    }
        
}