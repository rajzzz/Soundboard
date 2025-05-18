let loopingSound = null;

class Looping {
    constructor(bpm) {
        this.bpm = bpm;
    }

    setupLoop(soundId, glowBar) {
        const audio = document.getElementById(soundId);
        let bpm = this.bpm.getBPM();
        const interval = (60 / bpm) * 1000; // Loop once every bar
        const fadeDuration = 50; // milliseconds

        if (loopingSound) {
            clearInterval(loopingSound.intervalId);
            loopingSound = null;
        }

        loopingSound = {
            soundId: soundId,
            intervalId: setInterval(() => {
                if (audio) {
                    // Fade-out
                    let volume = 1;
                    const fadeOutInterval = setInterval(() => {
                        if (volume > 0) {
                            volume = Math.max(0, volume - 0.1);
                            audio.volume = volume;
                        } else {
                            audio.pause();
                            audio.currentTime = 0;
                            clearInterval(fadeOutInterval);

                            // Fade-in
                            audio.volume = 0;
                            audio.play();
                            let fadeInVolume = 0;
                            const fadeInInterval = setInterval(() => {
                                fadeInVolume = Math.min(1, fadeInVolume + 0.1);
                                audio.volume = fadeInVolume;
                                if (fadeInVolume >= 1) {
                                    clearInterval(fadeInInterval);
                                }
                            }, fadeDuration / 10);
                        }
                    }, fadeDuration / 10);

                    glowBar.glow();
                }
            }, interval)
        };
    }

    clearLoop() {
        if (loopingSound) {
            clearInterval(loopingSound.intervalId);
            loopingSound = null;
        }
    }

    isLooping() {
        return loopingSound !== null;
    }
}

export default Looping;
