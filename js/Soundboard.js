import BPM from './BPM.js';
import GlowBar from './GlowBar.js';
import Looping from './Looping.js';

export class Soundboard {
    constructor(soundButtonsDiv, visualizer) {
        this.soundButtonsDiv = soundButtonsDiv;
        this.visualizer = visualizer;
        this.bpm = new BPM();
        this.glowBar = new GlowBar();
        this.looping = new Looping(this.bpm);

        // Bind the setupLoop function to the Soundboard instance
        this.setupLoop = this.setupLoop.bind(this);
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
                    if (otherButton !== button && document.activeElement === otherButton) {
                        isOtherButtonPressed = true;
                    }
                });

                if (isOtherButtonPressed) {
                    this.clearLoop();
                    return;
                }

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
                }, 10); // Update every 1-second fill
            });

            button.addEventListener('mouseup', () => {
                clearInterval(holdTimer);
                button.classList.remove('filling');
                button.style.background = ''; // Reset background
            });

            button.addEventListener('mouseleave', () => {
                clearInterval(holdTimer);
                button.classList.remove('filling');
                button.style.background = ''; // Reset background
            });

            const container = document.createElement('div');
            container.appendChild(button);

            this.soundButtonsDiv.appendChild(container);
        });
    }

    playSound(soundId) {
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    }

    toggleLoop(soundId, button) {
        if (button.classList.contains('looping')) {
            this.clearLoop();
            button.classList.remove('looping');
            button.style.transform = ''; // Reset size
            button.style.backgroundColor = ''; // Reset color
        } else {
            this.clearLoop();
            this.setupLoop(soundId, this.glowBar);
            button.classList.add('looping');
            button.style.transform = 'scale(1.2)'; // Size up
            button.style.backgroundColor = 'var(--accent-color)'; // Make colorful
        }
    }

    setupLoop(soundId, glowBar) {
        this.looping.setupLoop(soundId, glowBar);
    }

    clearLoop() {
        this.looping.clearLoop();
    }

    setupHotkeys(sounds) {
        const keyTimers = {};

        window.addEventListener('keydown', (event) => {
            const pressedKey = event.key.toLowerCase();
            const soundToPlay = sounds.find(s => s.key === pressedKey);

            if (soundToPlay) {
                
                const button = document.getElementById(`button-${soundToPlay.id}`);
                
                // Check if any other button is pressed
                const allButtons = document.querySelectorAll('.sound-btn');
                let isOtherButtonPressed = false;
                allButtons.forEach(otherButton => {
                    if (document.activeElement !== null && otherButton !== document.activeElement && otherButton !== document.body) {
                        isOtherButtonPressed = true;
                    }
                });

                if (isOtherButtonPressed) {
                    this.clearLoop();
                }

                this.playSound(soundToPlay.id);

                if (button) {
                    if (!keyTimers[soundToPlay.id] && !isOtherButtonPressed) {
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
                    // Preserve existing box-shadow and add accent ring
                    const prevBoxShadow = button.style.boxShadow || window.getComputedStyle(button).boxShadow || '';
                    button.style.boxShadow = `${prevBoxShadow ? prevBoxShadow + ',' : ''}0 0 0 4px var(--accent-color)`;
                    setTimeout(() => {
                        // Remove only the accent ring, keep any other box-shadow
                        const current = button.style.boxShadow.split(',').filter(s => !s.includes('var(--accent-color)')).join(',');
                        if (current.trim()) {
                            button.style.boxShadow = current;
                        } else {
                            button.style.removeProperty('boxShadow');
                        }
                    }, 200);
                }
            }
        });

        window.addEventListener('keyup', (event) => {
            const pressedKey = event.key.toLowerCase();
            const soundToPlay = sounds.find(s => s.key === pressedKey);

            if (soundToPlay) {
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
        if (button.classList.contains('looping')) {
            this.clearLoop();
            button.classList.remove('looping');
            button.style.transform = ''; // Reset size
            button.style.backgroundColor = ''; // Reset color
        } else {
            this.clearLoop();
            this.setupLoop(soundId);
            button.classList.add('looping');
            button.style.transform = 'scale(1.2)'; // Size up
            button.style.backgroundColor = 'var(--accent-color)'; // Make colorful
        }
    }
}
