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

import { drawFretboard } from "./draw.js";

const notes = [
  { string: 4, fret: 0, note: "C" },
  { string: 4, fret: 2, note: "D" },
  { string: 4, fret: 4, note: "E" },
  { string: 4, fret: 5, note: "F" },

  { string: 3, fret: 0, note: "G" },
  { string: 3, fret: 2, note: "A" },
  { string: 3, fret: 4, note: "B" },
  { string: 3, fret: 5, note: "C" },

  { string: 2, fret: 0, note: "D" },
  { string: 2, fret: 2, note: "E" },
  { string: 2, fret: 3, note: "F" },
  { string: 2, fret: 5, note: "G" },

  { string: 1, fret: 0, note: "A" },
  { string: 1, fret: 2, note: "B" },
  { string: 1, fret: 3, note: "C" },
  { string: 1, fret: 5, note: "D" },
];

let currentNote = null;
let showingAnswer = false;
let exploreMode = false; // Toggle to show all notes

// Double-tap/click detection
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 200; // milliseconds
let singleTapTimeout = null;

// Spaced repetition: track when each note was last shown
const noteHistory = new Map();
notes.forEach((note, index) => {
  noteHistory.set(index, Date.now() - index * 1000); // Stagger initial times
});

// Global practice counter backend (see server.js). Defaults to the local
// dev server; point this at your deployed endpoint in production.
const COUNTER_API = "http://localhost:8787";
const countElement = document.getElementById("count");

function renderCount(value) {
  countElement.textContent = `${value} notes shown`;
}

// Read the current global count on load; stay silent if the backend is down.
fetch(COUNTER_API)
  .then((res) => res.json())
  .then(({ value }) => renderCount(value))
  .catch(() => {});

// Record one practiced note and show the updated global count.
function recordPractice() {
  fetch(COUNTER_API, { method: "POST" })
    .then((res) => res.json())
    .then(({ value }) => renderCount(value))
    .catch(() => {});
}

const canvas = document.getElementById("fretboard");
const ctx = canvas.getContext("2d");

// Audio setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Open string frequencies for C-G-D-A tuning
const openStringFrequencies = {
  4: 130.81, // C3
  3: 196.0, // G3
  2: 293.66, // D4
  1: 440.0, // A4
};

function getNoteFrequency(note) {
  const openFreq = openStringFrequencies[note.string];
  // Each fret increases pitch by one semitone (multiply by 2^(1/12))
  return openFreq * Math.pow(2, note.fret / 12);
}

function playNote(frequency) {
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

function selectNextNote() {
  const now = Date.now();
  const currentIndex = currentNote ? notes.indexOf(currentNote) : -1;

  // Calculate weights based on time since last shown
  const weights = notes.map((note, index) => {
    if (index === currentIndex) return 0; // Never select the same note twice

    const timeSinceShown = now - noteHistory.get(index);
    // Weight increases with time: notes not seen for 10+ seconds get full weight
    const weight = Math.min(timeSinceShown / 10000, 1);
    return Math.max(weight, 0.1); // Minimum weight of 0.1 for all notes
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < notes.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      noteHistory.set(i, now); // Record when this note was shown
      return notes[i];
    }
  }

  return notes[0]; // Fallback
}

function nextQuestion() {
  currentNote = selectNextNote();
  showingAnswer = false;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);
}

function showAnswer() {
  showingAnswer = true;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);

  // Play the note
  const frequency = getNoteFrequency(currentNote);
  playNote(frequency);

  // Count this as one practiced note in the global tally.
  recordPractice();
}

// Calculate note position on canvas
function getNotePosition(note) {
  const padding = 40;
  const numStrings = 4;
  const numFrets = 5;
  const stringSpacing = (canvas.width - 2 * padding) / (numStrings - 1);
  const fretSpacing = (canvas.height - 2 * padding) / numFrets;

  const stringIndex = numStrings - note.string;
  const fretIndex = note.fret;

  const x = padding + stringIndex * stringSpacing;
  let y;

  if (fretIndex === 0) {
    y = padding - 15;
  } else {
    y = padding + fretIndex * fretSpacing - fretSpacing / 2;
  }

  return { x, y };
}

// Handle canvas click/touch
function handleCanvasClick(clientX, clientY) {
  const currentTime = Date.now();
  const timeSinceLastTap = currentTime - lastTapTime;

  // Check for double tap
  if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
    // Clear any pending single-tap action
    if (singleTapTimeout) {
      clearTimeout(singleTapTimeout);
      singleTapTimeout = null;
    }
    toggleExploreMode();
    lastTapTime = 0; // Reset to prevent triple-tap
    return;
  }

  lastTapTime = currentTime;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (clientX - rect.left) * scaleX;
  const clickY = (clientY - rect.top) * scaleY;

  if (exploreMode) {
    // In explore mode, check if any note was clicked (immediate, no delay)
    for (const note of notes) {
      const notePos = getNotePosition(note);
      const distance = Math.sqrt(
        Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
      );

      if (distance < 20) {
        const frequency = getNoteFrequency(note);
        playNote(frequency);
        return;
      }
    }
  } else {
    // Normal training mode - delay action to detect potential double-tap
    if (!currentNote) return;

    const notePos = getNotePosition(currentNote);
    const distance = Math.sqrt(
      Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
    );

    // Delay the action to allow double-tap detection
    singleTapTimeout = setTimeout(() => {
      if (distance < 20) {
        showAnswer();
      } else {
        nextQuestion();
      }
      singleTapTimeout = null;
    }, DOUBLE_TAP_DELAY);
  }
}

function toggleExploreMode() {
  exploreMode = !exploreMode;
  if (exploreMode) {
    drawExploreMode();
  } else {
    // Return to training mode with the same note
    drawFretboard(ctx, canvas, currentNote, showingAnswer);
  }
}

function drawExploreMode() {
  drawFretboard(ctx, canvas, null, false, notes);
}

// Add click/touch event listeners
canvas.addEventListener("click", (e) => {
  handleCanvasClick(e.clientX, e.clientY);
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleCanvasClick(touch.clientX, touch.clientY);
});

nextQuestion();
