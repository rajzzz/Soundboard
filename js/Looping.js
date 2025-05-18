let loopingSound = null;

class Looping {
    constructor(bpm) {
        this.bpm = bpm;
    }

    setupLoop(soundId, glowBar) {
        const originalAudio = document.getElementById(soundId);
        let bpm = this.bpm.getBPM();
        const interval = (60 / bpm) * 1000; // Loop once every bar

        if (loopingSound) {
            clearInterval(loopingSound.intervalId);
            loopingSound = null;
        }

        // Start the continuous glow effect
        glowBar.glow(true);

        loopingSound = {
            soundId: soundId,
            glowBar: glowBar,
            intervalId: setInterval(() => {
                if (originalAudio) {
                    // Create a new audio instance for each loop iteration
                    const audio = new Audio(originalAudio.src);
                    audio.play();
                }
            }, interval)
        };
    }

    clearLoop() {
        if (loopingSound) {
            clearInterval(loopingSound.intervalId);
            if (loopingSound.glowBar) {
                loopingSound.glowBar.glow(false); // Stop the glow effect
            }
            loopingSound = null;
        }
    }

    isLooping() {
        return loopingSound !== null;
    }
}

export default Looping;
