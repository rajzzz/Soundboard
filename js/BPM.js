class BPM {
    constructor() {
        this.bpm = 120; // Default BPM
        this.bpmInput = document.getElementById('bpm');
        this.bpmUp = document.getElementById('bpmUp');
        this.bpmDown = document.getElementById('bpmDown');

        this.bpmInput.value = this.bpm;

        this.bpmUp.addEventListener('click', () => {
            this.updateBPM(5);
        });

        this.bpmDown.addEventListener('click', () => {
            this.updateBPM(-5);
        });

        this.bpmInput.addEventListener('change', () => {
            this.bpm = parseInt(this.bpmInput.value, 10);
        });
    }

    updateBPM(change) {
        this.bpm += change;
        this.bpmInput.value = this.bpm;
    }

    getBPM() {
        return parseInt(this.bpmInput.value, 10);
    }
}

export default BPM;
