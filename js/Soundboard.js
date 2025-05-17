export class Soundboard {
    constructor(soundButtonsDiv, visualizer) {
        this.soundButtonsDiv = soundButtonsDiv;
        this.visualizer = visualizer;
    }

    createButtons(sounds) {
        sounds.forEach(sound => {
            const button = document.createElement('button');
            button.id = `button-${sound.id}`;
            button.classList.add('bg-blue-600', 'hover:bg-blue-700', 'text-white', 
                'font-bold', 'py-4', 'px-6', 'rounded-lg', 'shadow-lg', 
                'transition', 'duration-200', 'ease-in-out', 'transform', 
                'hover:scale-105');
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
                    button.classList.add('ring-4', 'ring-blue-400');
                    setTimeout(() => {
                        button.classList.remove('ring-4', 'ring-blue-400');
                    }, 200);
                }
            }
        });
    }
}