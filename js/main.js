import { sounds } from './sounds.js';
import { WaveformVisualizer } from './WaveformVisualizer.js';
import { Soundboard } from './Soundboard.js';

const waveformCanvas = document.getElementById('waveformCanvas');
const soundButtonsDiv = document.getElementById('soundButtons');

const visualizer = new WaveformVisualizer(waveformCanvas);
let precomputedData = {};
let soundboard; // Declare soundboard variable

// Load precomputed frequency data
fetch('./sounds/sample/precomputed_frequencies.json')
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
                }
            });
        }
        if (audio) {
            audio.addEventListener('ended', () => {
                visualizer.stop();
            });
        }
    });
    // Hotkey support for visualizer
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();
        const sound = sounds.find(s => s.key === pressedKey);
        if (sound && precomputedData[sound.id]) {
            visualizer.blendTo(precomputedData[sound.id]);
        }
    });
}

window.onload = () => {
    visualizer.resize();
};

window.addEventListener('resize', () => visualizer.resize());
