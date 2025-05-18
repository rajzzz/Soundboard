import BPM from './BPM.js';
import GlowBar from '../visualizers/GlowBar.js';
import Looping from '../audio/Looping.js';

export class Soundboard {
    constructor(soundButtonsDiv, visualizer, bpmInstance) {
        this.soundButtonsDiv = soundButtonsDiv;
        this.visualizer = visualizer;
        this.bpm = bpmInstance; // Use the passed BPM instance
        this.glowBar = new GlowBar();
        this.looping = new Looping(this.bpm); // Pass the same BPM instance to Looping

        // this.setupLoop = this.setupLoop.bind(this); // No longer needed
    }

    createButtons(sounds) {
        sounds.forEach(sound => {
            const button = document.createElement('button');
            button.id = `button-${sound.id}`;
            button.classList.add('sound-btn');
            button.textContent = `${sound.label} (${sound.key.toUpperCase()})`;
            button.dataset.soundId = sound.id;
            button.dataset.key = sound.key;

            let holdTimer;
            let fillPercentage = 0;

            button.addEventListener('mousedown', () => {
                // Check if any other button is pressed
                const allButtons = document.querySelectorAll('.sound-btn');
                let isOtherButtonPressed = false;
                allButtons.forEach(otherButton => {
                    if (otherButton !== button && otherButton.classList.contains('looping')) {
                        isOtherButtonPressed = true;
                    }
                });

                // if (isOtherButtonPressed) { // Removed for multi-loop
                    // this.looping.clearAllLoops();
                    // return;
                // }

                this.playSound(sound.id); // Play sound on initial mousedown

                fillPercentage = 0;
                button.classList.add('filling');
                button.style.background = `linear-gradient(to right, var(--accent-color) ${fillPercentage}%, var(--secondary-color) ${fillPercentage}%)`;

                holdTimer = setInterval(() => {
                    fillPercentage += 2;
                    button.style.background = `linear-gradient(to right, var(--accent-color) ${Math.min(fillPercentage, 100)}%, var(--secondary-color) ${Math.min(fillPercentage, 100)}%)`;

                    if (fillPercentage >= 100) {
                        clearInterval(holdTimer);
                        this.toggleLoop(sound.id, button);
                        button.classList.remove('filling');
                    }
                }, 10);

                // Add glow effect for button press
                button.classList.add('glow');
                setTimeout(() => {
                    if (!button.classList.contains('looping')) {
                        button.classList.remove('glow');
                    }
                }, 200);
            });

            button.addEventListener('mouseup', () => {
                clearInterval(holdTimer);
                button.classList.remove('filling');
                button.style.background = '';
                if (!button.classList.contains('looping')) {
                    button.classList.remove('glow');
                }
            });

            button.addEventListener('mouseleave', () => {
                clearInterval(holdTimer);
                button.classList.remove('filling');
                button.style.background = '';
                if (!button.classList.contains('looping')) {
                    button.classList.remove('glow');
                }
            });

            const container = document.createElement('div');
            container.appendChild(button);

            this.soundButtonsDiv.appendChild(container);
        });
    }

    playSound(soundId) {
        const audio = document.getElementById(soundId);
        const heading = document.querySelector('h1');
        if (audio) {
            // Create a new audio instance for overlapping sounds
            const newAudio = new Audio(audio.src);
            newAudio.play();
            heading.classList.add('accent-backdrop-active');
            setTimeout(() => {
                heading.classList.remove('accent-backdrop-active');
            }, 200);
        }
    }

    toggleLoop(soundId, button) {
        // Check if this specific sound is currently part of the multi-loop
        if (this.looping.isSoundLooping(soundId)) {
            this.looping.removeSoundFromLoop(soundId);
            button.classList.remove('looping');
            button.style.transform = ''; // Reset size
            button.style.backgroundColor = ''; // Reset color
            console.log(`Soundboard: Removed ${soundId} from loop.`);
        } else {
            // Add this sound to the multi-loop
            // The `this.glowBar` is passed as the elementVisualizer for the priority sound.
            // This assumes this.glowBar is the main glow bar instance.
            this.looping.addSoundToLoop(soundId, this.glowBar);
            button.classList.add('looping');
            button.style.transform = 'scale(1.2)'; // Size up
            button.style.backgroundColor = 'var(--accent-color)'; // Make colorful
            console.log(`Soundboard: Added ${soundId} to loop.`);
        }
    }

    // The old setupLoop and clearLoop methods are removed.
    // Direct calls to this.looping.addSoundToLoop, this.looping.removeSoundFromLoop,
    // or this.looping.clearAllLoops (if a global clear is needed) should be used.

    setupHotkeys(sounds) {
        const keyTimers = {};
        let activeButtons = new Set();

        window.addEventListener('keydown', (event) => {
            const pressedKey = event.key.toLowerCase();
            const soundToPlay = sounds.find(s => s.key === pressedKey);

            if (soundToPlay) {
                const button = document.getElementById(`button-${soundToPlay.id}`);
                
                // If another key is already being held down (looping)
                // if (activeButtons.size > 0 && !activeButtons.has(soundToPlay.id)) { // Removed for multi-loop
                    // this.looping.clearAllLoops();
                    // Clear any existing fill timer for this button
                // }
                if (keyTimers[soundToPlay.id]) { // This check should remain if fill timer needs clearing independently
                    clearInterval(keyTimers[soundToPlay.id]);
                    delete keyTimers[soundToPlay.id];
                    if (button) {
                        button.classList.remove('filling');
                        button.style.background = '';
                    }
                }
                // Extra braces removed from here

                activeButtons.add(soundToPlay.id);
                this.playSound(soundToPlay.id);

                if (button && !keyTimers[soundToPlay.id]) {
                    let fillPercentage = 0;
                    button.classList.add('filling');
                    button.style.background = `linear-gradient(to right, var(--accent-color) ${fillPercentage}%, var(--secondary-color) ${fillPercentage}%)`;

                    keyTimers[soundToPlay.id] = setInterval(() => {
                        fillPercentage += 2;
                        button.style.background = `linear-gradient(to right, var(--accent-color) ${Math.min(fillPercentage, 100)}%, var(--secondary-color) ${Math.min(fillPercentage, 100)}%)`;

                        if (fillPercentage >= 100) {
                            clearInterval(keyTimers[soundToPlay.id]);
                            delete keyTimers[soundToPlay.id];
                            this.toggleLoop(soundToPlay.id, button);
                            button.classList.remove('filling');
                        }
                    }, 10);
                }

                // Add quick glow effect for keypress
                button.classList.add('glow');
                setTimeout(() => {
                    button.classList.remove('glow');
                }, 200);
            }
        });

        window.addEventListener('keyup', (event) => {
            const pressedKey = event.key.toLowerCase();
            const soundToPlay = sounds.find(s => s.key === pressedKey);

            if (soundToPlay) {
                activeButtons.delete(soundToPlay.id);
                const button = document.getElementById(`button-${soundToPlay.id}`);
                if (button && keyTimers[soundToPlay.id]) {
                    clearInterval(keyTimers[soundToPlay.id]);
                    delete keyTimers[soundToPlay.id];
                    button.classList.remove('filling');
                    button.style.background = '';
                }
            }
        });
    }

    toggleLoop(soundId, button) {
        // Check if this specific sound is currently part of the multi-loop
        if (this.looping.isSoundLooping(soundId)) {
            this.looping.removeSoundFromLoop(soundId);
            button.classList.remove('looping');
            button.style.transform = ''; // Reset size
            button.style.backgroundColor = ''; // Reset color
            console.log(`Soundboard (hotkey): Removed ${soundId} from loop.`);
        } else {
            // Add this sound to the multi-loop
            // The `this.glowBar` is passed as the elementVisualizer for the priority sound.
            this.looping.addSoundToLoop(soundId, this.glowBar);
            button.classList.add('looping');
            button.style.transform = 'scale(1.2)'; // Size up
            button.style.backgroundColor = 'var(--accent-color)'; // Make colorful
            console.log(`Soundboard (hotkey): Added ${soundId} to loop.`);
        }
    }
}
