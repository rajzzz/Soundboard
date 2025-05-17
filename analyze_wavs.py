import os
import json
import numpy as np
from scipy.io import wavfile
import scipy.signal

AUDIO_DIR = "sounds/sample"
OUTPUT_JSON = os.path.join(AUDIO_DIR, "precomputed_frequencies.json")
FRAME_SIZE = 1024
HOP_SIZE = 512

def frequency_bin_range(sample_rate, frame_size, low_hz, high_hz):
    nyquist = sample_rate / 2
    bin_hz = nyquist / (frame_size // 2)
    start_bin = int(low_hz / bin_hz)
    end_bin = int(high_hz / bin_hz)
    return start_bin, end_bin

# Normalize each frequency bin (column) across all frames
def normalize_frames(frames):
    arr = np.array(frames)
    min_vals = arr.min(axis=0)
    max_vals = arr.max(axis=0)
    denom = (max_vals - min_vals)
    denom[denom == 0] = 1
    norm = (arr - min_vals) / denom
    return norm.tolist()

def moving_average(frames, window_size=7):
    arr = np.array(frames)
    if len(arr) < window_size:
        return arr.tolist()
    kernel = np.ones(window_size) / window_size
    smoothed = np.vstack([
        np.convolve(arr[:, i], kernel, mode='same')
        for i in range(arr.shape[1])
    ]).T
    return smoothed.tolist()

def interpolate_frames(frames, factor=2):
    arr = np.array(frames)
    n_frames, n_bins = arr.shape
    new_n_frames = n_frames * factor - (factor - 1)
    x_old = np.arange(n_frames)
    x_new = np.linspace(0, n_frames - 1, new_n_frames)
    interp = np.zeros((new_n_frames, n_bins))
    for i in range(n_bins):
        interp[:, i] = np.interp(x_new, x_old, arr[:, i])
    return interp.tolist()

def smooth_bspline(frames, num_points=128):
    # Interpolate each frame to a fixed number of points using B-spline (very smooth)
    from scipy.interpolate import make_interp_spline
    arr = np.array(frames)
    n_frames, n_bins = arr.shape
    x_old = np.linspace(0, 1, n_bins)
    x_new = np.linspace(0, 1, num_points)
    smoothed = []
    for frame in arr:
        spline = make_interp_spline(x_old, frame, k=3)
        smoothed.append(spline(x_new))
    return np.array(smoothed)

def analyze_wav(filepath):
    sr, data = wavfile.read(filepath)
    if data.ndim > 1:
        data = data.mean(axis=1)  # Mono
    start_bin, end_bin = frequency_bin_range(sr, FRAME_SIZE, 20, 4000)
    frames = []
    hann = scipy.signal.windows.hann(FRAME_SIZE, sym=False)
    for start in range(0, len(data) - FRAME_SIZE, HOP_SIZE):
        frame = data[start:start+FRAME_SIZE] * hann
        spectrum = np.abs(np.fft.rfft(frame))
        focused = spectrum[start_bin:end_bin+1]  # Bass + mid only
        frames.append(focused)
    # Interpolate frames for smoothness
    interp_frames = interpolate_frames(frames, factor=2)
    # B-spline smoothing to 128 points per frame (ultra-smooth)
    smooth_frames = smooth_bspline(interp_frames, num_points=128)
    # Normalize
    norm_frames = normalize_frames(smooth_frames)
    # Moving average smoothing
    final_frames = moving_average(norm_frames, window_size=7)
    return final_frames

result = {}
for fname in os.listdir(AUDIO_DIR):
    if fname.lower().endswith(".wav"):
        sound_id = os.path.splitext(fname)[0]
        print(f"Analyzing {fname}...")
        frames = analyze_wav(os.path.join(AUDIO_DIR, fname))
        result[sound_id] = frames

with open(OUTPUT_JSON, "w") as f:
    json.dump(result, f)

print(f"Done! Output written to {OUTPUT_JSON}")
