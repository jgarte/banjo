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

// This module synthesises note playback with the Web Audio API. Each note is
// built as a short-lived graph of audio nodes: several OscillatorNodes (the
// harmonics), each through its own GainNode, summed into a low-pass
// BiquadFilterNode, then a master GainNode, and finally the AudioContext's
// output (destination):
//
//   oscillators -> per-harmonic gains -> filter -> master gain -> destination
//
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

// Open string frequencies for C-G-D-A tuning
/** @type {Record<number, number>} */
const openStringFrequencies = {
  4: 130.81, // C3
  3: 196.0, // G3
  2: 293.66, // D4
  1: 440.0, // A4
};

/**
 * @param {{ string: number, fret: number }} note
 * @returns {number}
 */
export function getNoteFrequency(note) {
  const openFreq = openStringFrequencies[note.string];
  // Each fret increases pitch by one semitone (multiply by 2^(1/12))
  return openFreq * Math.pow(2, note.fret / 12);
}

// The AudioContext is the entry point to the Web Audio API: it owns the audio
// graph and its clock (currentTime). Created lazily on first playback so this
// module can be imported outside a browser (e.g. tests) and so the context
// starts after a user gesture, as browsers require.
// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
/** @type {AudioContext | undefined} */
let audioContext;

/**
 * Play a single plucked note by building and starting a short Web Audio graph.
 * @param {number} frequency
 */
export function playNote(frequency) {
  const audio = (audioContext ??= new (window.AudioContext ||
    /** @type {any} */ (window).webkitAudioContext)());
  // currentTime is the context's running clock, used to schedule the envelopes.
  const now = audio.currentTime;
  const duration = 1.3;

  // BiquadFilterNode is a configurable frequency filter; a "lowpass" type with
  // a bright, resonant cutoff (frequency/Q are AudioParams) shapes the metallic
  // banjo timbre.
  // https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(5500, now);
  filter.Q.setValueAtTime(2, now);

  // GainNode controls volume; its .gain is an AudioParam whose value we automate
  // over time (setValueAtTime, linear-/exponentialRampToValueAtTime) to shape
  // the amplitude envelope — a sharp pluck attack and fast decay.
  // https://developer.mozilla.org/en-US/docs/Web/API/GainNode
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioParam
  const masterGain = audio.createGain();
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
    // OscillatorNode generates a periodic tone; one sine oscillator per
    // harmonic, summed to build up the timbre.
    // https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(harmonic.freq, now);

    const harmonicGain = audio.createGain();
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

  // AudioNode.connect wires the graph together; destination is the context's
  // final output (the speakers).
  filter.connect(masterGain);
  masterGain.connect(audio.destination);
}
