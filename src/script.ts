import { drawFretboard, NOTE_RADIUS, createFretboardConfig } from "./draw.js";
import { notes } from "./notes.js";
import type { Note } from "./notes.js";
import type { FretboardConfig } from "./draw.js";

export let currentNote: Note;
let previousNote: Note;
export let showingAnswer = false;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let config: FretboardConfig;

function nextNote(): void {
  previousNote = currentNote;
  currentNote = notes[chooseNote()];
  while (currentNote === previousNote) {
    currentNote = notes[chooseNote()];
  }
  showingAnswer = false;
  drawFretboard(ctx, canvas, config);

  function chooseNote(): number {
    return Math.floor(Math.random() * notes.length);
  }
}

function showNote(): void {
  showingAnswer = true;
  drawFretboard(ctx, canvas, config);
}

type Position = {
  x: number;
  y: number;
};

// Calculate note position on canvas
function getNotePosition(note: Note): Position {
  const stringIndex = config.numStrings - note.string;
  const fretIndex = note.fret;

  const x = config.padding + stringIndex * config.stringSpacing;
  let y: number;

  if (fretIndex === 0) {
    y = config.padding - 15;
  } else {
    y =
      config.padding + fretIndex * config.fretSpacing - config.fretSpacing / 2;
  }

  return { x, y };
}

async function handleCanvasClick(
  clientX: number,
  clientY: number,
): Promise<void> {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (clientX - rect.left) * scaleX;
  const clickY = (clientY - rect.top) * scaleY;

  const notePos = getNotePosition(currentNote);
  const distance = Math.sqrt(
    Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
  );

  if (distance < NOTE_RADIUS * 1.5) {
    showNote();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    nextNote();
  } else {
    nextNote();
  }
}

function init(): void {
  const canvasEl = document.getElementById("fretboard") as HTMLCanvasElement;
  canvas = canvasEl;
  ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  config = createFretboardConfig(canvas);

  canvas.addEventListener("click", (e: MouseEvent) => {
    handleCanvasClick(e.clientX, e.clientY);
  });

  nextNote();
}

if (typeof document !== "undefined") {
  init();
}
