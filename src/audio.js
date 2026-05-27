// banjo
// Copyright (C) 2026 jgart
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// Open string frequencies for C-G-D-A tuning
const openStringFrequencies = {
  4: 130.81, // C3
  3: 196.0, // G3
  2: 293.66, // D4
  1: 440.0, // A4
};

export function getNoteFrequency(note) {
  const openFreq = openStringFrequencies[note.string];
  // Each fret increases pitch by one semitone (multiply by 2^(1/12))
  return openFreq * Math.pow(2, note.fret / 12);
}

// Created lazily on first playback so this module can be imported outside a
// browser (e.g. tests) and so the context starts after a user gesture, as
// browsers require.
let audioContext;

export function playNote(frequency) {
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  const duration = 1.3;

  // Create a low-pass filter with a bright, resonant cutoff for the
  // metallic banjo timbre
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(5500, now);
  filter.Q.setValueAtTime(2, now);

  // Master gain: sharp pluck attack and fast decay
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.3, now + 0.002); // Sharp attack
  masterGain.gain.exponentialRampToValueAtTime(0.08, now + 0.08); // Quick initial decay
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Fast tail

  // Create harmonics for richer sound, weighted toward the upper
  // partials that give a banjo its bright twang
  const harmonics = [
    { freq: frequency, gain: 0.35 }, // Fundamental
    { freq: frequency * 2, gain: 0.32 }, // 2nd harmonic
    { freq: frequency * 3, gain: 0.25 }, // 3rd harmonic
    { freq: frequency * 4, gain: 0.18 }, // 4th harmonic
    { freq: frequency * 5, gain: 0.1 }, // 5th harmonic
    { freq: frequency * 6, gain: 0.06 }, // 6th harmonic
  ];

  harmonics.forEach((harmonic, index) => {
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(harmonic.freq, now);

    const harmonicGain = audioContext.createGain();
    harmonicGain.gain.setValueAtTime(harmonic.gain, now);

    // Higher harmonics decay faster (banjo string characteristic)
    const decayRate = 1 + index * 0.4;
    harmonicGain.gain.exponentialRampToValueAtTime(
      harmonic.gain * 0.01,
      now + duration / decayRate,
    );

    osc.connect(harmonicGain);
    harmonicGain.connect(filter);

    osc.start(now);
    osc.stop(now + duration);
  });

  // Connect filter to master gain to output
  filter.connect(masterGain);
  masterGain.connect(audioContext.destination);
}
