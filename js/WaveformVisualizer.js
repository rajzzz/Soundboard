export class WaveformVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animationFrameId = null;
        // precomputedData: an array of frames, each frame is an array of frequency amplitudes (0 to 1)
        this.precomputedData = null;
        this.frameIndex = 0;
    }
    
    drawWaveform() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#444545';
        const fill = secondary + '33'; // 20% opacity for fill

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!this.precomputedData) {
            // Idle straight line at bottom using secondary color
            ctx.beginPath();
            const y = canvas.height - 2; // 2px from bottom for visibility
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.strokeStyle = secondary;
            ctx.lineWidth = 4;
            ctx.shadowColor = secondary;
            ctx.shadowBlur = 20;
            ctx.stroke();
            // Draw fill for idle state as well
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            return;
        }

        let dataFrame = this.precomputedData[this.frameIndex];

        if (this.lastFrame && this.crossfadeProgress < 1) {
            const alpha = this.crossfadeProgress;
            const blended = dataFrame.map((v, i) => {
                const prev = this.lastFrame[i] !== undefined ? this.lastFrame[i] : 0;
                return prev * (1 - alpha) + v * alpha;
            });
            dataFrame = blended;
            this.crossfadeProgress += 1 / this.crossfadeFrames;
        }

        const numPoints = dataFrame.length;
        const xSpacing = canvas.width / (numPoints - 1);
        const points = [];

        // Normalize the frame
        const min = Math.min(...dataFrame);
        const max = Math.max(...dataFrame);
        let normFrame = dataFrame.map(v => (max - min) > 0 ? (v - min) / (max - min) : 0);

        // Apply a moving average to smooth the curve
        const windowSize = 7; // Increase for more smoothness
        if (normFrame.length > windowSize) {
            const smoothed = [];
            for (let i = 0; i < normFrame.length; i++) {
                let sum = 0;
                let count = 0;
                for (let j = -Math.floor(windowSize/2); j <= Math.floor(windowSize/2); j++) {
                    const idx = i + j;
                    if (idx >= 0 && idx < normFrame.length) {
                        sum += normFrame[idx];
                        count++;
                    }
                }
                smoothed.push(sum / count);
            }
            normFrame = smoothed;
        }

        for (let i = 0; i < numPoints; i++) {
            const x = i * xSpacing;
            const amplitude = normFrame[i]; // 0 is bottom, 1 is top
            const y = canvas.height - amplitude // baseline at bottom
            points.push({ x, y });
        }

        // Compute loudness
        const loudness = normFrame.reduce((a, b) => a + b, 0) / normFrame.length;
        const intensity = Math.min(1, loudness);

        // Style based on loudness
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 2 + intensity * 6;
        ctx.shadowColor = secondary;
        ctx.shadowBlur = 10 + intensity * 30;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        // Use cubic Bezier for smoother curve
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            if (i === 0) {
                ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
            } else {
                ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
            }
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();

        // Fill area under curve
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();

        // Advance frame
        this.frameIndex++;
        if (this.frameIndex < this.precomputedData.length) {
            this.animationFrameId = requestAnimationFrame(() => this.drawWaveform());
        } else {
            this.precomputedData = null;
            this.frameIndex = 0;
            this.animationFrameId = null;
            this.lastFrame = null;
        }
    }


    // Pass in your precomputed frequency data when starting the animation
    animate(precomputedData) {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // If a waveform is currently animating, blend the last visible frame with the new one
        if (this.precomputedData && this.frameIndex > 0 && this.frameIndex <= this.precomputedData.length) {
            this.lastFrame = this.precomputedData[this.frameIndex - 1] || this.precomputedData[0];
        } else if (this.currentBlendFrame) {
            // If a blend is already in progress, use the current blend frame
            this.lastFrame = this.currentBlendFrame;
        } else {
            this.lastFrame = null;
        }
        this.precomputedData = precomputedData;
        this.frameIndex = 0;
        this.crossfadeProgress = 0; // 0 to 1
        this.crossfadeFrames = 15; // Number of frames for the transition (longer for smoother)
        this.drawWaveform();
    }

    // New: Blend between any two arbitrary frames (for live feel)
    blendTo(precomputedData) {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        const fromFrame = this.currentBlendFrame || this.lastFrame || (this.precomputedData && this.precomputedData[this.frameIndex - 1]) || precomputedData[0];
        const toFrame = precomputedData[0];
        const frames = 15;
        let progress = 0;
        const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#444545';
        const fill = secondary + '33';
        const animateBlend = () => {
            const alpha = progress / frames;
            // Blend WITHOUT normalization for string-like effect
            let blended = fromFrame.map((v, i) => v * (1 - alpha) + toFrame[i] * alpha);
            this.currentBlendFrame = blended;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.strokeStyle = secondary;
            this.ctx.lineWidth = 4;
            this.ctx.shadowColor = secondary;
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            const numPoints = blended.length;
            const xSpacing = this.canvas.width / (numPoints - 1);
            for (let i = 0; i < numPoints; i++) {
                const x = i * xSpacing;
                const amplitude = blended[i];
                const y = this.canvas.height - amplitude * this.canvas.height * 0.8;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
            // Fill under the curve for blend animation
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fillStyle = fill;
            this.ctx.fill();
            progress++;
            if (progress <= frames) {
                this.animationFrameId = requestAnimationFrame(animateBlend);
            } else {
                this.currentBlendFrame = null;
                this.animate(precomputedData);
            }
        };
        animateBlend();
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // If we have a lastFrame, animate to baseline. Otherwise, just draw baseline.
        if (this.lastFrame) {
            this._animateToBaselineFrom(this.lastFrame);
        } else if (this.precomputedData && this.frameIndex > 0) {
            // If animation just finished, use the last frame of the last animation
            const last = this.precomputedData[this.frameIndex - 1] || this.precomputedData[0];
            this._animateToBaselineFrom(last);
        } else {
            this.precomputedData = null;
            this.frameIndex = 0;
            this.lastFrame = null;
            this.drawWaveform();
        }
    }

    _animateToBaselineFrom(frame) {
        const frames = 40; // More frames for smoother ending
        let progress = 0;
        const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#444545';
        const fill = secondary + '33';
        const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const animateFrame = () => {
            const t = progress / frames;
            const alpha = easeInOutQuad(t);
            let blended = frame.map((v) => v * (1 - alpha));
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.strokeStyle = secondary;
            this.ctx.lineWidth = 4;
            this.ctx.shadowColor = secondary;
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            const numPoints = blended.length;
            const xSpacing = this.canvas.width / (numPoints - 1);
            for (let i = 0; i < numPoints; i++) {
                const x = i * xSpacing;
                const y = this.canvas.height - blended[i] * this.canvas.height * 0.8;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
            // Fill under the curve for baseline animation
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fillStyle = fill;
            this.ctx.fill();
            progress++;
            if (progress <= frames) {
                this.animationFrameId = requestAnimationFrame(animateFrame);
            } else {
                this.precomputedData = null;
                this.frameIndex = 0;
                this.animationFrameId = null;
                this.lastFrame = null;
                this.drawWaveform();
            }
        };
        animateFrame();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        // Redraw without restarting the animation
        // (optional) this.drawWaveform();
   }


    // Draw a vertical waveform on the canvas (for left/right sidebars)
    drawVerticalWaveform(dataFrame, orientation = 'left') {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#444545';
        const fill = secondary + '33';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const numPoints = dataFrame.length;
        const ySpacing = canvas.height / (numPoints -1);

        // Normalize the frame
        const min = Math.min(...dataFrame);
        const max = Math.max(...dataFrame);
        let normFrame = dataFrame.map(v => (max - min) > 0 ? (v - min) / (max - min) : 0.5);

        // Smoothing

        // Points for vertical waveform
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const y = i * ySpacing;
            // 0 is edge, 1 is center, but baseline should hug the edge
            let x;
            if (orientation === 'left') {
                // Baseline is exactly at the left edge (x=0)
                x = 0 + (normFrame[i]*0.4) * (canvas.width - 1); // full width minus 1px for anti-aliasing
            } else {
                // Baseline is exactly at the right edge (x=canvas.width)
                x = canvas.width - (normFrame[i]*0.4) * (canvas.width - 1);
            }
            points.push({ x, y });
        }
        // Draw waveform
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(orientation === 'left' ? 0 : canvas.width, 0); // Start at edge
        // Use quadratic interpolation for smoothness
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.lineTo(orientation === 'left' ? 0 : canvas.width, canvas.height); // End at edge
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 4;
        ctx.shadowColor = secondary;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(orientation === 'left' ? 0 : canvas.width, 0);
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.stroke();
        ctx.restore();
    }
}