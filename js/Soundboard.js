export class Soundboard {
    constructor(soundButtonsDiv, visualizer) {
        this.soundButtonsDiv = soundButtonsDiv;
        this.visualizer = visualizer;
    }

    createButtons(sounds) {
        sounds.forEach(sound => {
            const button = document.createElement('button');
            button.id = `button-${sound.id}`;
            button.classList.add('sound-btn');
            button.textContent = `${sound.label} (${sound.key.toUpperCase()})`;
            button.dataset.soundId = sound.id;
            button.dataset.key = sound.key;

            button.addEventListener('click', () => this.playSound(sound.id));
            this.soundButtonsDiv.appendChild(button);
        });
    }

    playSound(soundId) {
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    }

    setupHotkeys(sounds) {
        window.addEventListener('keydown', (event) => {
            const pressedKey = event.key.toLowerCase();
            const soundToPlay = sounds.find(sound => sound.key === pressedKey);

            if (soundToPlay) {
                this.playSound(soundToPlay.id);
                const button = document.getElementById(`button-${soundToPlay.id}`);
                if (button) {
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
    }
}