// Sunset Vice Cover Lab — editor.
// Owns the cover state, wires every control in index.html to it, draws the
// live preview through cover-draw.js, and exports the same drawing as a PNG.
// Photos are read on this machine (file input / drag & drop / bundled samples)
// and never uploaded. The preview canvas and the export canvas are drawn by
// the same function, so what you see is what the PNG holds.

import { LAYOUTS, GRADES, EXPORT_SIZES, drawCover } from './cover-draw.js';
import { applyShotParams } from './shot-mode.js';

const $ = (id) => document.getElementById(id);

const SAMPLES = ['./samples/pier.jpg', './samples/boulevard.jpg'];

// One panel's photo transform. zoom 1 fills the panel; ox/oy pan it.
function freshPanel() {
  return { zoom: 1, ox: 0, oy: 0, src: '' };
}

const state = {
  layout: 'vice-grid',
  grade: 'sunset',
  caption: 'SUNSET HEIST',
  subcaption: 'VICE CITY • 2026',
  captionColor: '#ffd166',
  captionScale: 1,
  size: '1080x1080',
  panels: [freshPanel(), freshPanel(), freshPanel()],
};

// Loaded photos, one per panel, in panel order; null means the panel is empty.
let panelImages = [null, null, null];
let selectedPanel = 0;

const canvas = $('coverPreview');
const previewCtx = canvas.getContext('2d');

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

function currentSize() {
  return EXPORT_SIZES[state.size] ?? EXPORT_SIZES['1080x1080'];
}

// Resize the preview canvas to the export aspect, then draw the cover.
function render() {
  const { w, h } = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(previewCtx, w, h, state, panelImages);
  syncPanelPicker();
  syncSliders();
  window.__coverReady = true;
}

function setStatus(text) {
  $('statusLine').textContent = text;
}

// ---- panel picker ----

function syncPanelPicker() {
  const picker = $('panelPicker');
  const count = panelCount();
  while (picker.children.length > count) picker.removeChild(picker.lastChild);
  for (let i = 0; i < count; i++) {
    let chip = picker.children[i];
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'panel-chip';
      chip.addEventListener('click', () => {
        selectedPanel = i;
        render();
      });
      picker.appendChild(chip);
    }
    const photo = state.panels[i];
    const label = photo && photo.src ? photo.src.split('/').pop().replace(/\.[^.]+$/, '') : 'empty';
    chip.textContent = `Panel ${i + 1} · ${label}`;
    chip.classList.toggle('active', i === selectedPanel);
  }
}

function syncSliders() {
  const photo = state.panels[selectedPanel] ?? freshPanel();
  $('zoomRange').value = String(Math.round(photo.zoom * 100));
  $('zoomValue').textContent = `${Math.round(photo.zoom * 100)}%`;
  $('panXRange').value = String(Math.round(photo.ox * 100));
  $('panYRange').value = String(Math.round(photo.oy * 100));
  $('captionSizeRange').value = String(Math.round(state.captionScale * 100));
  $('captionSizeValue').textContent = `${Math.round(state.captionScale * 100)}%`;
}

// ---- photo loading ----

function loadImageFromUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function putPhotoInto(index, img, srcLabel) {
  panelImages[index] = img;
  state.panels[index] = { zoom: 1, ox: 0, oy: 0, src: srcLabel };
  selectedPanel = index;
  render();
}

async function loadSampleInto(index, path) {
  const img = await loadImageFromUrl(path);
  if (!img) return;
  if (index === 'all-empty') {
    for (let i = 0; i < panelCount(); i++) {
      if (!panelImages[i]) {
        panelImages[i] = img;
        state.panels[i] = { zoom: 1, ox: 0, oy: 0, src: path };
      }
    }
    render();
    return;
  }
  if (index < panelCount()) await putPhotoInto(index, img, path);
}

async function loadFileInto(index, file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
  const img = await loadImageFromUrl(dataUrl);
  if (!img) {
    setStatus('That file did not load as a photo — try another image.');
    return;
  }
  await putPhotoInto(index, img, file.name);
  setStatus(`Loaded ${file.name} into panel ${index + 1}.`);
}

function loadSamples() {
  const jobs = [];
  for (let i = 0; i < panelCount(); i++) {
    jobs.push(loadSampleInto(i, SAMPLES[i % SAMPLES.length]));
  }
  Promise.all(jobs).then(() => setStatus('Sample photos loaded — drag them, zoom, then export.'));
}

// ---- layout / grade / size ----

function setLayout(layout) {
  if (!LAYOUTS[layout]) return;
  const oldImages = panelImages;
  const oldPanels = state.panels;
  const count = LAYOUTS[layout].panels.length;
  state.layout = layout;
  panelImages = Array.from({ length: count }, (_, i) => oldImages[i] ?? null);
  state.panels = Array.from({ length: count }, (_, i) => oldPanels[i] ?? freshPanel());
  selectedPanel = Math.min(selectedPanel, count - 1);
  document.querySelectorAll('#layoutRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === layout);
  });
  render();
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  state.grade = grade;
  document.querySelectorAll('#gradeRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === grade);
  });
  render();
}

function setSize(size) {
  if (!EXPORT_SIZES[size]) return;
  state.size = size;
  document.querySelectorAll('#sizeRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === size);
  });
  render();
}

function setCaption(text) {
  state.caption = text;
  const input = $('captionInput');
  if (input.value !== text) input.value = text;
  render();
}

function setSubcaption(text) {
  state.subcaption = text;
  const input = $('subInput');
  if (input.value !== text) input.value = text;
  render();
}

// Nudge one panel's photo vertically (-1..1), as the Pan slider does.
function setPan(index, oy) {
  if (!state.panels[index]) return;
  state.panels[index].oy = Math.max(-1, Math.min(1, oy));
  render();
}

// ---- export ----

// Draw the cover at full export size and download it as a PNG.
async function exportCover() {
  const button = $('exportBtn');
  button.disabled = true;
  setStatus('Drawing your cover…');
  try {
    await document.fonts.ready;
    const { w, h } = currentSize();
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    drawCover(offscreen.getContext('2d'), w, h, state, panelImages);
    const blob = await new Promise((resolve) => offscreen.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('the PNG did not render');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sunset-vice-cover-${w}x${h}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported sunset-vice-cover-${w}x${h}.png — share it anywhere.`);
    return { w, h, bytes: blob.size };
  } catch (error) {
    setStatus(`Export failed: ${error.message}`);
    throw error;
  } finally {
    button.disabled = false;
  }
}

// ---- pointer editing on the preview ----

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const { w, h } = currentSize();
  return {
    x: ((event.clientX - rect.left) / rect.width) * w,
    y: ((event.clientY - rect.top) / rect.height) * h,
  };
}

function panelAt(x, y) {
  const { w, h } = currentSize();
  const panels = LAYOUTS[state.layout].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x * w && x <= (p.x + p.w) * w && y >= p.y * h && y <= (p.y + p.h) * h) return i;
  }
  return 0;
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = panelAt(point.x, point.y);
  selectedPanel = hit;
  canvas.setPointerCapture(event.pointerId);
  drag = { x: point.x, y: point.y, moved: false };
  canvas.classList.add('dragging');
  render();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag || !panelImages[selectedPanel]) return;
  const point = canvasPoint(event);
  const dx = point.x - drag.x;
  const dy = point.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
  const { w, h } = currentSize();
  const frac = LAYOUTS[state.layout].panels[selectedPanel];
  const photo = state.panels[selectedPanel];
  photo.ox = Math.max(-1, Math.min(1, photo.ox + (dx / (frac.w * w)) * 2));
  photo.oy = Math.max(-1, Math.min(1, photo.oy + (dy / (frac.h * h)) * 2));
  drag = { x: point.x, y: point.y, moved: drag.moved };
  render();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (!panelImages[selectedPanel]) return;
  const photo = state.panels[selectedPanel];
  const factor = Math.exp(-event.deltaY * 0.0012);
  photo.zoom = Math.max(0.5, Math.min(3, photo.zoom * factor));
  render();
}, { passive: false });

// Drag & drop a photo file straight onto the preview.
canvas.addEventListener('dragover', (event) => event.preventDefault());
canvas.addEventListener('drop', (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;
  const point = canvasPoint(event);
  loadFileInto(panelAt(point.x, point.y), file);
});

// ---- control wiring ----

document.querySelectorAll('#layoutRow .choice').forEach((button) => {
  button.addEventListener('click', () => setLayout(button.dataset.layout));
});

document.querySelectorAll('#gradeRow .choice').forEach((button) => {
  button.addEventListener('click', () => setGrade(button.dataset.grade));
});

document.querySelectorAll('#sizeRow .choice').forEach((button) => {
  button.addEventListener('click', () => setSize(button.dataset.size));
});

$('photoFile').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) loadFileInto(selectedPanel, file);
  event.target.value = '';
});

$('loadSamples').addEventListener('click', loadSamples);

$('fillAll').addEventListener('click', () => {
  const source = panelImages[selectedPanel];
  if (!source) {
    setStatus('Load a photo into this panel first, then fill the others with it.');
    return;
  }
  const transform = { ...state.panels[selectedPanel] };
  for (let i = 0; i < panelCount(); i++) {
    panelImages[i] = source;
    state.panels[i] = { ...transform };
  }
  render();
  setStatus('Every panel now shows the same photo — crop each one differently if you like.');
});

$('zoomRange').addEventListener('input', (event) => {
  state.panels[selectedPanel].zoom = Number(event.target.value) / 100;
  render();
});

$('panXRange').addEventListener('input', (event) => {
  state.panels[selectedPanel].ox = Number(event.target.value) / 100;
  render();
});

$('panYRange').addEventListener('input', (event) => {
  state.panels[selectedPanel].oy = Number(event.target.value) / 100;
  render();
});

$('captionInput').addEventListener('input', (event) => {
  state.caption = event.target.value;
  render();
});

$('subInput').addEventListener('input', (event) => {
  state.subcaption = event.target.value;
  render();
});

$('captionSizeRange').addEventListener('input', (event) => {
  state.captionScale = Number(event.target.value) / 100;
  render();
});

document.querySelectorAll('#captionColors .swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    state.captionColor = swatch.dataset.color;
    document.querySelectorAll('#captionColors .swatch').forEach((s) => {
      s.classList.toggle('active', s === swatch);
    });
    render();
  });
});

$('exportBtn').addEventListener('click', () => {
  exportCover().catch(() => { /* status line already explains the failure */ });
});

// ---- boot ----

window.__coverLab = { state, exportCover, render, setLayout, setGrade, setSize };

document.fonts.ready.then(() => render());
render();

applyShotParams(window.location.search, {
  setLayout,
  setGrade,
  setSize,
  setCaption,
  setSubcaption,
  setPan,
  loadSampleInto,
  render,
}).catch(() => {
  // A bad shot query never breaks the editor: the user just starts empty.
  render();
});
