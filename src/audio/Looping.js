import BPM from '../ui/BPM.js';

let audioContext = null; // Stays module-level, or could be on 'this' if preferred

class Looping {
    constructor(bpmInstance) {
        this.bpm = bpmInstance; // Instance of BPM class
        this.bufferCache = new Map();
        this.isContextInitialized = false; // For AudioContext

        // State for multi-looping
        this.activeLoopQueue = []; // Array of { soundId, audioBuffer, order, elementVisualizer }
                                   // 'order' is its original 0-indexed position when added.
                                   // 'elementVisualizer' could be a specific GlowBar for the button.

        this.isMultiLoopRunning = false;   // True if the main loop interval is active
        this.mainLoopTimeoutId = null;     // Timer ID for the main beat scheduling (using setTimeout for precision)
        this.bpmUpdateIntervalId = null; // Timer ID for checking BPM changes

        this.nextBeatCycleStartTime = 0; // audioContext.currentTime for the start of the next beat cycle

        this.priorityVisualizerGlowBar = null; // The GlowBar instance for the overall beat visualization,
                                               // taken from the first sound added to the loop.
        this.lastKnownBpm = 0;

        this.activeAudioSources = []; // To keep track of all currently playing AudioBufferSourceNodes for cleanup
    }

    async ensureAudioContext() {
        // Uses this.isContextInitialized
        if (!this.isContextInitialized) {
            // Initialize audioContext if it hasn't been already or if it's closed
            if (!audioContext || audioContext.state === 'closed') {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext initialized or re-initialized.');
            }
            this.isContextInitialized = true; // Mark as attempted initialization
        }
        
        if (audioContext && audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log('AudioContext resumed.');
            } catch (error) {
                console.warn('AudioContext resume failed:', error);
                // Potentially set this.isContextInitialized = false here if resume is critical
            }
        }
        return audioContext;
    }

    async loadAudioBuffer(url) {
        // Uses this.ensureAudioContext and this.bufferCache
        await this.ensureAudioContext();
        
        if (!audioContext || audioContext.state === 'closed') {
            console.error('Cannot load audio buffer, AudioContext is not running.');
            return null;
        }

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

    async addSoundToLoop(soundId, elementVisualizer) {
        await this.ensureAudioContext();
        if (!audioContext || audioContext.state !== 'running') {
            console.error('AudioContext not running, cannot add sound to loop.');
            return;
        }

        const originalAudioElement = document.getElementById(soundId);
        if (!originalAudioElement) {
            console.error(`Audio element with ID ${soundId} not found.`);
            return;
        }

        try {
            const audioBuffer = await this.loadAudioBuffer(originalAudioElement.src);
            if (!audioBuffer) {
                console.error(`Failed to load audio buffer for ${soundId}`);
                return;
            }

            // Check if sound is already in the loop
            if (this.activeLoopQueue.some(item => item.soundId === soundId)) {
                console.log(`Sound ${soundId} is already in the loop.`);
                return; // Or perhaps toggle/remove it, based on desired behavior
            }
            
            const newLoopItem = {
                soundId: soundId,
                audioBuffer: audioBuffer,
                order: this.activeLoopQueue.length, // This is its original add order
                elementVisualizer: elementVisualizer // Specific visualizer for this sound's button/element
            };

            if (this.activeLoopQueue.length === 0) {
                this.priorityVisualizerGlowBar = elementVisualizer; // The first sound's visualizer sets the main glow
                if (this.priorityVisualizerGlowBar && typeof this.priorityVisualizerGlowBar.glow === 'function') {
                    this.priorityVisualizerGlowBar.glow(true); // Turn on continuous glow for the priority bar
                }
            }

            this.activeLoopQueue.push(newLoopItem);
            console.log(`Sound ${soundId} added to loop. Queue size: ${this.activeLoopQueue.length}`);

            if (!this.isMultiLoopRunning) {
                this._startMainLoopScheduler();
            }
            // If already running, the next _executeBeatCycle will pick up the new sound.

        } catch (error) {
            console.error(`Error adding sound ${soundId} to loop:`, error);
        }
    }

    removeSoundFromLoop(soundId) {
        const indexToRemove = this.activeLoopQueue.findIndex(item => item.soundId === soundId);

        if (indexToRemove === -1) {
            console.log(`Sound ${soundId} not found in active loop queue.`);
            return;
        }

        const removedItem = this.activeLoopQueue.splice(indexToRemove, 1)[0];
        console.log(`Sound ${soundId} removed from loop. Queue size: ${this.activeLoopQueue.length}`);

        // Re-index the 'order' of remaining items
        // The 'order' property should reflect the current position in the queue for priority glow.
        this.activeLoopQueue.forEach((item, index) => {
            item.order = index;
        });

        if (this.activeLoopQueue.length === 0) {
            this._stopMainLoopScheduler();
            // No need to explicitly set this.priorityVisualizerGlowBar to null here,
            // _stopMainLoopScheduler handles turning off its glow.
        } else {
            // If the removed item was the priority (order 0 based on current queue),
            // or if the first item was removed, update the priority visualizer.
            if (indexToRemove === 0) {
                 if (removedItem.elementVisualizer && typeof removedItem.elementVisualizer.glow === 'function') {
                    removedItem.elementVisualizer.glow(false); // Turn off old priority glow if it was unique
                 }
                this.priorityVisualizerGlowBar = this.activeLoopQueue[0].elementVisualizer;
                if (this.priorityVisualizerGlowBar && typeof this.priorityVisualizerGlowBar.glow === 'function') {
                    this.priorityVisualizerGlowBar.glow(true); // Turn on new priority glow
                }
            }
        }
    }
    
    _startMainLoopScheduler() {
        if (this.isMultiLoopRunning || !audioContext || audioContext.state !== 'running') {
            return;
        }
        this.isMultiLoopRunning = true;
        this.lastKnownBpm = this.bpm.getBPM();
        
        // Initial scheduling with a slight delay
        this.nextBeatCycleStartTime = audioContext.currentTime + 0.05;
        this._scheduleNextBeatCycle();
        console.log('Multi-loop scheduler started.');

        // Monitor BPM changes
        if (this.bpmUpdateIntervalId) clearInterval(this.bpmUpdateIntervalId);
        this.bpmUpdateIntervalId = setInterval(() => {
            if (!this.isMultiLoopRunning) return;

            const currentBpm = this.bpm.getBPM();
            if (currentBpm !== this.lastKnownBpm) {
                console.log(`BPM changed from ${this.lastKnownBpm} to ${currentBpm}. Rescheduling loop.`);
                this.lastKnownBpm = currentBpm;

                this.activeAudioSources.forEach(source => {
                    try { source.stop(0); } catch (e) { /* ignore */ }
                });
                this.activeAudioSources = [];
                if (this.mainLoopTimeoutId) clearTimeout(this.mainLoopTimeoutId);

                if (this.priorityVisualizerGlowBar && typeof this.priorityVisualizerGlowBar.stopPulse === 'function') {
                    this.priorityVisualizerGlowBar.stopPulse(true);
                }
                
                this.nextBeatCycleStartTime = audioContext.currentTime + 0.1;
                this._scheduleNextBeatCycle();
            }
        }, 100);
    }

    _stopMainLoopScheduler() {
        this.isMultiLoopRunning = false;
        if (this.mainLoopTimeoutId) {
            clearTimeout(this.mainLoopTimeoutId);
            this.mainLoopTimeoutId = null;
        }
        if (this.bpmUpdateIntervalId) {
            clearInterval(this.bpmUpdateIntervalId);
            this.bpmUpdateIntervalId = null;
        }
        this.activeAudioSources.forEach(source => {
            try { source.stop(0); } catch (e) { /* ignore */ }
        });
        this.activeAudioSources = [];

        if (this.priorityVisualizerGlowBar && typeof this.priorityVisualizerGlowBar.glow === 'function') {
            this.priorityVisualizerGlowBar.glow(false);
        }
        if (this.priorityVisualizerGlowBar && typeof this.priorityVisualizerGlowBar.stopPulse === 'function') {
            this.priorityVisualizerGlowBar.stopPulse(false);
        }
        this.priorityVisualizerGlowBar = null; // Clear the reference
        console.log('Multi-loop scheduler stopped.');
    }

    _scheduleNextBeatCycle() {
        if (!this.isMultiLoopRunning || this.activeLoopQueue.length === 0 || !audioContext || audioContext.state !== 'running') {
            this._stopMainLoopScheduler();
            return;
        }

        const timeUntilNextCycle = (this.nextBeatCycleStartTime - audioContext.currentTime) * 1000;

        if (this.mainLoopTimeoutId) clearTimeout(this.mainLoopTimeoutId);

        this.mainLoopTimeoutId = setTimeout(() => {
            this._executeBeatCycle();
        }, Math.max(0, timeUntilNextCycle));
    }

    _executeBeatCycle() {
        if (!this.isMultiLoopRunning || this.activeLoopQueue.length === 0 || !audioContext || audioContext.state !== 'running') {
            return;
        }

        const currentBpm = this.bpm.getBPM();
        const beatInterval = 60 / currentBpm;
        const numSounds = this.activeLoopQueue.length;
        const subInterval = numSounds > 0 ? beatInterval / numSounds : beatInterval;

        this.activeAudioSources = this.activeAudioSources.filter(s => false); // Clear old, will re-add active

        for (let i = 0; i < numSounds; i++) {
            const item = this.activeLoopQueue[i];
            const playAt = this.nextBeatCycleStartTime + (i * subInterval);

            const source = audioContext.createBufferSource();
            source.buffer = item.audioBuffer;
            source.connect(audioContext.destination);
            
            try {
                source.start(playAt);
                this.activeAudioSources.push(source);
                source.onended = () => {
                    const index = this.activeAudioSources.indexOf(source);
                    if (index > -1) this.activeAudioSources.splice(index, 1);
                };

                // Glow logic: only for the sound that is currently designated as priority (first in queue - order 0)
                if (item.order === 0 && this.priorityVisualizerGlowBar && typeof this.priorityVisualizerGlowBar.schedulePulse === 'function') {
                    this.priorityVisualizerGlowBar.schedulePulse(playAt, beatInterval, audioContext);
                }

            } catch (error) {
                console.error(`Error starting sound ${item.soundId} in loop:`, error);
            }
        }
        
        this.nextBeatCycleStartTime += beatInterval;
        this._scheduleNextBeatCycle();
    }

    // Public method to clear all loops, effectively an alias or wrapper for _stopMainLoopScheduler
    clearAllLoops() { // Renamed from clearLoop for clarity if it clears everything
        this._stopMainLoopScheduler();
        this.activeLoopQueue = []; // Ensure queue is also cleared
        // this.priorityVisualizerGlowBar is nulled in _stopMainLoopScheduler
        console.log('All loops cleared.');
    }
    
    // Kept clearLoop for backward compatibility if Soundboard.js uses it, but it does the same.
    clearLoop() {
        this.clearAllLoops();
    }


    isLooping() { // Checks if any sound is actively looping
        return this.isMultiLoopRunning && this.activeLoopQueue.length > 0;
    }

    // New method to check if a specific sound is in the loop
    isSoundLooping(soundId) {
        return this.activeLoopQueue.some(item => item.soundId === soundId);
    }
}

export default Looping;
