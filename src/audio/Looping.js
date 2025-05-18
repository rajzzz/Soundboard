import BPM from '../ui/BPM.js';

let loopingSound = null;
let audioContext = null;

class Looping {
    constructor(bpm) {
        this.bpm = bpm;
        this.bufferCache = new Map();
        this.isContextInitialized = false;
    }

    async ensureAudioContext() {
        if (!this.isContextInitialized) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isContextInitialized = true;
        }
        
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
            } catch (error) {
                console.warn('AudioContext resume failed:', error);
            }
        }
        return audioContext;
    }

    async loadAudioBuffer(url) {
        await this.ensureAudioContext();
        
        if (this.bufferCache.has(url)) {
            return this.bufferCache.get(url);
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            this.bufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error('Error loading audio:', error);
            throw error;
        }
    }

    scheduleLoop(audioBuffer, startTime, interval) {
        if (!audioContext || audioContext.state !== 'running') return null;

        console.log(`Creating new audio source, scheduled for time ${startTime}, interval ${interval}s`);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // Store startTime for BPM changes
        source.startTime = startTime;
        
        try {
            source.start(startTime);
            console.log(`Source started, current audio context time: ${audioContext.currentTime}`);

            // Schedule glow effect to match audio precisely
            if (loopingSound && loopingSound.glowBar) {
                loopingSound.glowBar.schedulePulse(startTime, interval, audioContext);
            }
        } catch (error) {
            console.error('Error starting audio source:', error);
            return null;
        }

        if (loopingSound) {
            loopingSound.sources.push(source);
            console.log(`Source added to loop sources, total sources: ${loopingSound.sources.length}`);
        }

        // Schedule the next loop iteration - only if no BPM change is in progress
        if (loopingSound && loopingSound.isLooping) {
            // Store the scheduled next start time on the loopingSound object
            loopingSound.nextScheduledTime = startTime + interval;
            
            // Use a timeout that's slightly before the next beat to check if we should continue
            const timeUntilNextBeat = (startTime + interval) - audioContext.currentTime;
            const checkTime = Math.max(timeUntilNextBeat - 0.05, 0) * 1000; // Convert to ms, check 50ms before
            
            setTimeout(() => {
                // Only schedule the next iteration if we're still looping and no BPM change occurred
                if (loopingSound && loopingSound.isLooping) {
                    this.scheduleLoop(audioBuffer, loopingSound.nextScheduledTime, interval);
                }
            }, checkTime);
        }

        // Clean up source after it finishes
        source.onended = () => {
            if (loopingSound && loopingSound.sources) {
                const index = loopingSound.sources.indexOf(source);
                if (index > -1) {
                    loopingSound.sources.splice(index, 1);
                    console.log(`Source completed and removed, remaining sources: ${loopingSound.sources.length}`);
                }
            }
        };

        return source;
    }

    async setupLoop(soundId, glowBar) {
        try {
            await this.ensureAudioContext();
            
            const originalAudio = document.getElementById(soundId);
            const bpm = this.bpm.getBPM();
            const interval = 60 / bpm; // interval in seconds

            // Clean up any existing loop
            if (loopingSound) {
                await this.clearLoop();
            }

            const audioBuffer = await this.loadAudioBuffer(originalAudio.src);
            
            // Start the continuous glow effect
            glowBar.glow(true);

            loopingSound = {
                soundId: soundId,
                glowBar: glowBar,
                isLooping: true,
                sources: [],
                lastBpm: bpm,
                audioBuffer: audioBuffer,
                nextScheduledTime: 0
            };

            // Initial schedule with a slight delay to ensure clean start
            const startTime = audioContext.currentTime + 0.05;
            loopingSound.nextScheduledTime = startTime;
            
            console.log(`Setting up initial loop at BPM ${bpm}, interval ${interval}s`);
            const source = this.scheduleLoop(audioBuffer, startTime, interval);
            if (!source) {
                throw new Error('Failed to schedule initial audio');
            }

            // Monitor BPM changes
            loopingSound.bpmCheckInterval = setInterval(() => {
                if (!loopingSound || !loopingSound.isLooping) return;

                const currentBpm = this.bpm.getBPM();
                if (currentBpm !== loopingSound.lastBpm) {
                    console.log(`BPM changed from ${loopingSound.lastBpm} to ${currentBpm}`);
                    console.log(`Active sources before BPM change: ${loopingSound.sources.length}`);
                    
                    // Calculate new interval based on the new BPM
                    loopingSound.lastBpm = currentBpm;
                    const newInterval = 60 / currentBpm;
                    
                    // Stop all currently scheduled sources to prevent audio overlap
                    if (loopingSound.sources && loopingSound.sources.length > 0) {
                        console.log(`Stopping ${loopingSound.sources.length} active sources due to BPM change`);
                        loopingSound.sources.forEach(source => {
                            try {
                                source.stop(0);
                            } catch (e) {
                                // Ignore errors from already stopped sources
                            }
                        });
                        // Clear the sources array
                        loopingSound.sources = [];
                    }
                    
                    // Reset the GlowBar pulses to match the new BPM
                    if (loopingSound.glowBar) {
                        console.log('Resetting GlowBar pulses for new BPM');
                        // Stop existing pulses but keep the glow bar in "loop mode"
                        loopingSound.glowBar.stopPulse(true); // true = keep looping state
                    }
                    
                    // Schedule next sound with new interval - using a small delay for clean transition
                    const currentTime = audioContext.currentTime;
                    // Use a clean 100ms delay for the next beat to start
                    const nextStartTime = currentTime + 0.1;
                    console.log(`Scheduling new loop at time ${nextStartTime} with interval ${newInterval}`);
                    const source = this.scheduleLoop(audioBuffer, nextStartTime, newInterval);
                    
                    // Restart the glow bar pulses with the new interval
                    if (loopingSound.glowBar && source) {
                        loopingSound.glowBar.schedulePulse(nextStartTime, newInterval, audioContext);
                    }
                    
                    console.log(`Active sources after BPM change: ${loopingSound.sources.length}`);
                }
            }, 50);

        } catch (error) {
            console.error('Error setting up audio loop:', error);
            this.clearLoop();
            throw error;
        }
    }

    clearLoop() {
        if (loopingSound) {
            loopingSound.isLooping = false;
            if (loopingSound.sources) {
                loopingSound.sources.forEach(source => {
                    try {
                        source.stop(0);
                    } catch (e) {
                        // Ignore errors from already stopped sources
                    }
                });
            }
            if (loopingSound.bpmCheckInterval) {
                clearInterval(loopingSound.bpmCheckInterval);
            }
            if (loopingSound.glowBar) {
                loopingSound.glowBar.glow(false);
            }
            loopingSound = null;
        }
    }

    isLooping() {
        return loopingSound !== null && loopingSound.isLooping;
    }
}

export default Looping;
