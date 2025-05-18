class GlowBar {
    constructor() {
        this.glowingLine = document.querySelector('.fixed.bottom-0');
        this.isLooping = false;
        this.pulseAnimation = null;
    }

    glow(isLoop = false) {
        if (isLoop && !this.isLooping) {
            // Start continuous pulsing for loop
            this.isLooping = true;
            this.startPulse();
        } else if (!isLoop && this.isLooping) {
            // Stop pulsing if was looping
            this.isLooping = false;
            this.stopPulse();
        } else if (!isLoop) {
            // Single glow effect
            this.singleGlow();
        }
    }

    startPulse() {
        this.glowingLine.style.transition = 'all 0.3s ease-in-out';
        this.glowingLine.style.transformOrigin = 'bottom center';
        
        const pulse = () => {
            // Max pulse state
            this.glowingLine.style.transform = 'scaleY(5)';
            this.glowingLine.style.filter = 'blur(25px) brightness(2)';
            this.glowingLine.style.boxShadow = '0 0 50px 20px var(--accent-color)';
            
            setTimeout(() => {
                if (this.isLooping) {
                    // Relaxed pulse state
                    this.glowingLine.style.transform = 'scaleY(3)';
                    this.glowingLine.style.filter = 'blur(15px) brightness(1.7)';
                    this.glowingLine.style.boxShadow = '0 0 30px 10px var(--accent-color)';
                }
            }, 250);
        };

        pulse(); // Initial pulse
        this.pulseAnimation = setInterval(pulse, 500);
    }

    stopPulse() {
        clearInterval(this.pulseAnimation);
        this.pulseAnimation = null;
        this.glowingLine.style.transform = 'scaleY(1)';
        this.glowingLine.style.filter = 'blur(0px) brightness(1)';
        this.glowingLine.style.boxShadow = 'none';
        this.glowingLine.style.transformOrigin = 'center';
    }

    singleGlow() {
        this.glowingLine.style.transition = 'all 0.3s ease-in-out';
        this.glowingLine.style.transformOrigin = 'bottom center';
        this.glowingLine.style.transform = 'scaleY(5)';
        this.glowingLine.style.filter = 'blur(25px) brightness(2)';
        this.glowingLine.style.boxShadow = '0 0 50px 20px var(--accent-color)';
        
        setTimeout(() => {
            if (!this.isLooping) { // Only reset if not in looping state
                this.glowingLine.style.transform = 'scaleY(1)';
                this.glowingLine.style.filter = 'blur(0px) brightness(1)';
                this.glowingLine.style.boxShadow = 'none';
                this.glowingLine.style.transformOrigin = 'center';
            }
        }, 500);
    }
}

export default GlowBar;
