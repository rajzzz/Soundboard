import { sounds } from './audio/sounds.js';
import { WaveformVisualizer } from './visualizers/WaveformVisualizer.js';
import { Soundboard } from './ui/Soundboard.js';
import BPM from './ui/BPM.js';

// Remove the main waveform visualizer from the center
const waveformCanvas = document.getElementById('waveformCanvas');
if (waveformCanvas) waveformCanvas.style.display = 'none';

const soundButtonsDiv = document.getElementById('soundButtons');

const visualizer = new WaveformVisualizer(waveformCanvas);
let precomputedData = {};
let soundboard; // Declare soundboard variable
const bpm = new BPM();

// Load precomputed frequency data
fetch('./assets/sounds/precomputed_frequencies.json')
    .then(res => res.json())
    .then(data => {
        precomputedData = data;
        soundboard = new Soundboard(soundButtonsDiv, visualizer); // Initialize soundboard
        setupSoundboard();
    })
    .catch(err => {
        console.error('Failed to load precomputed frequency data:', err);
        soundboard = new Soundboard(soundButtonsDiv, visualizer); // Initialize soundboard even on error
        setupSoundboard(); // fallback, still allow UI
    });

function setupSoundboard() {
    soundboard.createButtons(sounds);
    soundboard.setupHotkeys(sounds);
    // Attach event listeners to trigger visualizer with precomputed data
    sounds.forEach(sound => {
        const btn = document.getElementById('button-' + sound.id);
        const audio = document.getElementById(sound.id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (precomputedData[sound.id]) {
                    visualizer.blendTo(precomputedData[sound.id]);
                    animateVerticalWaveforms(precomputedData[sound.id]);
                }
                // Shake logic removed
            });
        }
        if (audio) {
            audio.addEventListener('ended', () => {
                visualizer.stop();
                if (verticalWaveformLastFrame) {
                    fallbackVerticalWaveformsToBaseline(verticalWaveformLastFrame);
                } else {
                    if (leftWaveformVisualizer) leftWaveformVisualizer.drawVerticalWaveform(new Array(128).fill(0), 'left');
                    if (rightWaveformVisualizer) rightWaveformVisualizer.drawVerticalWaveform(new Array(128).fill(0), 'right');
                }
            });
        }
    });
    // Hotkey support for visualizer
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();
        const sound = sounds.find(s => s.key === pressedKey);
        if (sound && precomputedData[sound.id]) {
            visualizer.blendTo(precomputedData[sound.id]);
            animateVerticalWaveforms(precomputedData[sound.id]);
        }
    });
}

// --- Add this after the main waveform visualizer setup ---
// Setup for left and right vertical waveform canvases
const leftWaveformCanvas = document.getElementById('leftWavefront');
const rightWaveformCanvas = document.getElementById('rightWavefront');

const leftWaveformVisualizer = leftWaveformCanvas ? new WaveformVisualizer(leftWaveformCanvas) : null;
const rightWaveformVisualizer = rightWaveformCanvas ? new WaveformVisualizer(rightWaveformCanvas) : null;

let verticalWaveformAnimationId = null;
let verticalWaveformLastFrame = null;

function animateVerticalWaveforms(precomputedData) {
    if (!precomputedData) return;
    let frame = 0;
    let running = true;
    function drawFrame() {
        if (!running) return;
        const currentFrame = precomputedData[frame];
        verticalWaveformLastFrame = currentFrame;
        if (leftWaveformVisualizer) {
            leftWaveformVisualizer.drawVerticalWaveform(currentFrame, 'left');
        }
        if (rightWaveformVisualizer) {
            rightWaveformVisualizer.drawVerticalWaveform(currentFrame, 'right');
        }
        frame++;
        if (frame < precomputedData.length) {
            verticalWaveformAnimationId = requestAnimationFrame(drawFrame);
        } else {
            // Start fallback to baseline after last frame
            fallbackVerticalWaveformsToBaseline(currentFrame);
        }
    }
    drawFrame();
    animateVerticalWaveforms.stop = () => { running = false; };
}

function fallbackVerticalWaveformsToBaseline(lastFrame) {
    const frames = 40;
    let progress = 0;
    const zeroFrame = new Array(lastFrame.length).fill(0);
    function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
    function drawFallback() {
        const t = progress / frames;
        const alpha = ease(t);
        const blend = lastFrame.map(v => v * (1 - alpha));
        if (leftWaveformVisualizer) leftWaveformVisualizer.drawVerticalWaveform(blend, 'left');
        if (rightWaveformVisualizer) rightWaveformVisualizer.drawVerticalWaveform(blend, 'right');
        progress++;
        if (progress <= frames) {
            verticalWaveformAnimationId = requestAnimationFrame(drawFallback);
        } else {
            if (leftWaveformVisualizer) leftWaveformVisualizer.drawVerticalWaveform(zeroFrame, 'left');
            if (rightWaveformVisualizer) rightWaveformVisualizer.drawVerticalWaveform(zeroFrame, 'right');
            verticalWaveformLastFrame = zeroFrame;
        }
    }
    drawFallback();
}

window.onload = () => {
    visualizer.resize();
};

window.addEventListener('resize', () => visualizer.resize());
