class GlowBar {
    constructor() {
        this.glowingLine = document.querySelector('.fixed.bottom-0');
        this.isLooping = false;
        this.pulseAnimation = null;
        this.scheduledPulses = [];
    }

    glow(isLoop = false) {
        if (isLoop && !this.isLooping) {
            this.isLooping = true;
        } else if (!isLoop && this.isLooping) {
            this.isLooping = false;
            this.stopPulse();
        } else if (!isLoop) {
            this.singleGlow();
        }
    }

    schedulePulse(startTime, interval, audioContext) {
        if (!this.isLooping) return;

        // Clear any existing pulses first to avoid overlapping animations
        this.stopPulse(true);
        
        console.log(`GlowBar: Scheduling new pulse sequence at time ${startTime}, interval ${interval}s`);

        const scheduleNextPulse = (pulseTime) => {
            if (!this.isLooping) return;
            
            // Schedule visual pulse to match audio
            const timeUntilPulse = pulseTime - audioContext.currentTime;
            if (timeUntilPulse > 0) {
                console.log(`GlowBar: Scheduling pulse in ${timeUntilPulse.toFixed(3)}s`);
                const timeoutId = setTimeout(() => {
                    this.doPulse();
                    // Schedule next pulse
                    scheduleNextPulse(pulseTime + interval);
                }, timeUntilPulse * 1000);
                
                this.scheduledPulses.push(timeoutId);
            }
        };

        // Start the scheduling chain
        scheduleNextPulse(startTime);
    }

    doPulse() {
        if (!this.isLooping) return;
        
        // Ensure the line is visible with accent color
        this.glowingLine.style.backgroundColor = 'var(--accent-color)';
        this.glowingLine.style.opacity = '1';
        
        // Max pulse state with enhanced glow
        this.glowingLine.style.transition = 'all 0.15s ease-in-out';
        this.glowingLine.style.transformOrigin = 'bottom center';
        this.glowingLine.style.transform = 'scaleY(8)';
        this.glowingLine.style.filter = 'blur(35px) brightness(2.5)';
        this.glowingLine.style.boxShadow = '0 0 80px 30px var(--accent-color), 0 0 120px 50px var(--accent-color)';

        // Schedule relaxed state to occur halfway through the pulse
        setTimeout(() => {
            if (this.isLooping) {
                this.glowingLine.style.transform = 'scaleY(3)';
                this.glowingLine.style.filter = 'blur(25px) brightness(2)';
                this.glowingLine.style.boxShadow = '0 0 60px 25px var(--accent-color)';
                // Maintain enhanced visibility in relaxed state
                this.glowingLine.style.opacity = '1';
            }
        }, 75);
    }

    stopPulse(keepLoopingState = false) {
        console.log(`GlowBar: Stopping all pulses, keepLoopingState=${keepLoopingState}, scheduled pulses: ${this.scheduledPulses.length}`);
        
        // Clear all scheduled pulses
        if (this.scheduledPulses && this.scheduledPulses.length > 0) {
            this.scheduledPulses.forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
        }
        this.scheduledPulses = [];
        
        // Reset visual state but maintain base visibility
        this.glowingLine.style.transition = 'all 0.2s ease-out';
        this.glowingLine.style.transform = 'scaleY(1)';
        this.glowingLine.style.filter = 'blur(0px) brightness(1)';
        this.glowingLine.style.boxShadow = 'none';
        this.glowingLine.style.transformOrigin = 'center';
        this.glowingLine.style.backgroundColor = 'var(--accent-color)';
        this.glowingLine.style.opacity = '1';
        
        // Only reset the isLooping flag if we're not keeping the state
        // This allows us to stop pulses temporarily (e.g., during BPM changes)
        // without fully deactivating the looping state
        if (!keepLoopingState) {
            this.isLooping = false;
        } else {
            console.log('GlowBar: Maintaining looping state while clearing pulses');
        }
    }

    singleGlow() {
        this.glowingLine.style.transition = 'all 0.3s ease-in-out';
        this.glowingLine.style.transformOrigin = 'bottom center';
        this.glowingLine.style.transform = 'scaleY(5)';
        this.glowingLine.style.filter = 'blur(25px) brightness(2)';
        this.glowingLine.style.boxShadow = '0 0 50px 20px var(--accent-color)';
        
        setTimeout(() => {
            if (!this.isLooping) {
                this.glowingLine.style.transform = 'scaleY(1)';
                this.glowingLine.style.filter = 'blur(0px) brightness(1)';
                this.glowingLine.style.boxShadow = 'none';
                this.glowingLine.style.transformOrigin = 'center';
            }
        }, 300);
    }
}

export default GlowBar;
