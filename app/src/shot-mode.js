// Sunset Vice Cover Lab — shot mode.
// Reads the page's own query string (?shot=editor&photo=pier&photo2=boulevard
// &caption=...&layout=...&grade=...&size=...) and loads the named sample photos
// into the panels, so a screenshot run can open the editor with photos already
// in place. Only the bundled samples (samples/pier.jpg, samples/boulevard.jpg)
// are addressable here — never an arbitrary URL, so the app stays offline.

const SAMPLE_NAMES = new Set(['pier', 'boulevard']);

function samplePath(name) {
  return SAMPLE_NAMES.has(name) ? `./samples/${name}.jpg` : null;
}

// Apply the shot parameters to a live cover lab. hooks: { setLayout, setGrade,
// setSize, setCaption, setSubcaption, loadSampleInto, render }. Returns a
// promise that settles once the photos are in and the first render is done.
export async function applyShotParams(search, hooks) {
  const params = new URLSearchParams(search);
  if (!params.has('shot')) return false;

  const layout = params.get('layout');
  if (layout) hooks.setLayout(layout);
  const grade = params.get('grade');
  if (grade) hooks.setGrade(grade);
  const size = params.get('size');
  if (size) hooks.setSize(size);
  const caption = params.get('caption');
  if (caption !== null) hooks.setCaption(caption);
  const sub = params.get('sub');
  if (sub !== null) hooks.setSubcaption(sub);

  // photo, photo2, photo3 fill panels 0, 1, 2 in order; a missing one leaves
  // that panel as it is, and a lone `photo` fills every empty panel.
  const names = [params.get('photo'), params.get('photo2'), params.get('photo3')];
  const loads = [];
  names.forEach((name, i) => {
    const path = name ? samplePath(name) : null;
    if (path) loads.push(hooks.loadSampleInto(i, path));
  });
  if (names[0] && !names[1] && !names[2]) {
    // One photo named: use it for every panel that is still empty.
    const path = samplePath(names[0]);
    if (path) loads.push(hooks.loadSampleInto('all-empty', path));
  }
  await Promise.all(loads);
  // oy0, oy1, oy2 nudge one panel's photo up or down (-1..1), mirroring
  // the Pan slider in the editor — handy for framing a face in a wide panel.
  // Applied after the photos load: loading a photo resets its transform.
  ['oy0', 'oy1', 'oy2'].forEach((key, i) => {
    const raw = params.get(key);
    if (raw !== null) {
      const value = Number(raw);
      if (Number.isFinite(value)) hooks.setPan(i, Math.max(-1, Math.min(1, value)));
    }
  });
  await document.fonts.ready;
  hooks.render();
  return true;
}
