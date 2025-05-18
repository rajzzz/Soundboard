class GlowBar {
    constructor() {
        this.glowingLine = document.querySelector('.fixed.bottom-0');
    }

    glow() {
        this.glowingLine.classList.add('active');
        this.glowingLine.style.transition = 'transform 0.2s ease-in-out';
        this.glowingLine.style.transformOrigin = 'bottom center';
        this.glowingLine.style.transform = 'scaleY(2)'; // Make it bulge out as a curve
        setTimeout(() => {
            this.glowingLine.classList.remove('active');
            this.glowingLine.style.transform = 'scaleY(1)'; // Reset transform
            this.glowingLine.style.transformOrigin = 'center';
        }, 500);
    }
}

export default GlowBar;
