// Sunset Vice Cover Lab — cover renderer.
// One function draws the whole poster, so the on-screen preview and the
// exported PNG can never drift apart: both call drawCover with the same state.
// All artwork here is drawn in code (gradient sky, synthwave sun, panel gutters,
// bold caption type). No Rockstar logo, artwork or font is used anywhere.

export const LAYOUTS = {
  'vice-grid': {
    name: 'Vice Grid',
    // hero panel on top, two small panels below it
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.6 },
      { x: 0.0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
  'neon-split': {
    name: 'Neon Split',
    // two tall panels side by side, caption band across the bottom
    panels: [
      { x: 0.0, y: 0.0, w: 0.56, h: 1.0 },
      { x: 0.56, y: 0.0, w: 0.44, h: 1.0 },
    ],
  },
  'sunset-strip': {
    name: 'Sunset Strip',
    // three horizontal strips stacked top to bottom
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.34 },
      { x: 0.0, y: 0.34, w: 1.0, h: 0.33 },
      { x: 0.0, y: 0.67, w: 1.0, h: 0.33 },
    ],
  },
};

export const GRADES = {
  sunset: {
    name: 'Sunset',
    photoFilter: 'saturate(1.28) contrast(1.08) brightness(1.02)',
    wash: ['rgba(255, 122, 26, 0.0)', 'rgba(255, 46, 136, 0.22)'],
    sun: ['#ffe259', '#ff7e3d', '#ff2e88'],
  },
  neon: {
    name: 'Neon',
    photoFilter: 'saturate(1.5) contrast(1.12) hue-rotate(-12deg)',
    wash: ['rgba(77, 232, 255, 0.16)', 'rgba(255, 46, 168, 0.26)'],
    sun: ['#4de8ff', '#b04dff', '#ff2e88'],
  },
  noir: {
    name: 'Noir',
    photoFilter: 'grayscale(1) contrast(1.18) brightness(1.06)',
    wash: ['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.34)'],
    sun: ['#f5efe6', '#c9c2b8', '#6e6a66'],
  },
};

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

// Cover-fit a photo into a panel rect, with a zoom factor and a pan offset.
// zoom 1 fills the panel exactly; ox/oy shift the photo by a fraction of the
// panel size (-1..1). Returns the rect to draw the image into.
export function fitPhotoRect(panel, img, zoom, ox, oy) {
  const panelRatio = panel.w / panel.h;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  let drawW;
  let drawH;
  if (imgRatio > panelRatio) {
    drawH = panel.h * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = panel.w * zoom;
    drawH = drawW / imgRatio;
  }
  const x = panel.x + (panel.w - drawW) / 2 + ox * panel.w * 0.5;
  const y = panel.y + (panel.h - drawH) / 2 + oy * panel.h * 0.5;
  return { x, y, w: drawW, h: drawH };
}

// Draw one photo clipped to its panel, with the grade's filter applied.
function drawPhotoPanel(ctx, panel, img, photo, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (img) {
    const r = fitPhotoRect(panel, img, photo.zoom, photo.ox, photo.oy);
    ctx.filter = grade.photoFilter;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.filter = 'none';
  } else {
    // Empty panel: a dark placeholder with a dashed frame and a label.
    ctx.fillStyle = '#241533';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(2, panel.w * 0.004);
    ctx.setLineDash([panel.w * 0.02, panel.w * 0.015]);
    ctx.strokeRect(panel.x + 14, panel.y + 14, panel.w - 28, panel.h - 28);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `${Math.round(panel.h * 0.09)}px 'Archivo Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
  }
  ctx.restore();
}

// Original synthwave sun: a gradient disc with horizontal slats cut out of
// its lower half, drawn at (cx, cy) with radius r.
export function drawSynthSun(ctx, cx, cy, r, colors) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.55, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: the sky colour showing through, widening toward the bottom.
  ctx.fillStyle = 'rgba(20, 8, 38, 0.9)';
  let y = cy + r * 0.05;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.11;
    gap *= 1.45;
  }
  ctx.restore();
  // Soft halo around the sun.
  const halo = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.9);
  halo.addColorStop(0, 'rgba(255, 126, 61, 0.28)');
  halo.addColorStop(1, 'rgba(255, 126, 61, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
}

// Fit the caption to the canvas width, shrinking it until it fits.
function captionFontSize(ctx, text, maxWidth, baseSize) {
  let size = baseSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

// Draw the whole poster. state: { layout, grade, caption, subcaption,
// captionColor, captionScale, panels: [{zoom, ox, oy}] }. images: an array of
// HTMLImageElement|null, one per panel of the layout, in panel order.
export function drawCover(ctx, W, H, state, images) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS['vice-grid'];
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const gutter = Math.max(4, Math.round(W * 0.006));

  // Night-sky backing.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1c0b33');
  sky.addColorStop(0.55, '#2c1248');
  sky.addColorStop(1, '#12061f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Photo panels, inset by the gutter so dark seams separate them.
  layout.panels.forEach((frac, i) => {
    const panel = {
      x: frac.x * W + gutter,
      y: frac.y * H + gutter,
      w: frac.w * W - gutter * 2,
      h: frac.h * H - gutter * 2,
    };
    drawPhotoPanel(ctx, panel, images[i] ?? null, state.panels[i] ?? { zoom: 1, ox: 0, oy: 0 }, grade);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  });

  // Synthwave sun tucked into the top-right of the hero (first) panel.
  const hero = layout.panels[0];
  const sunR = Math.min(W, H) * 0.11;
  drawSynthSun(ctx, hero.x * W + hero.w * W - sunR * 1.15, hero.y * H + sunR * 1.25, sunR, grade.sun);

  // Grade wash + vignette over the whole poster.
  const wash = ctx.createLinearGradient(0, 0, W * 0.4, H);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 20, 0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Top-left badge.
  const badgeH = Math.round(H * 0.042);
  const badgePad = Math.round(W * 0.018);
  ctx.font = `${Math.round(badgeH * 0.52)}px 'Archivo Black', sans-serif`;
  const badgeText = 'SUNSET VICE';
  const badgeW = ctx.measureText(badgeText).width + badgePad * 2;
  ctx.fillStyle = 'rgba(10, 4, 20, 0.72)';
  ctx.beginPath();
  ctx.roundRect(gutter + 6, gutter + 6, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, gutter + 6 + badgePad, gutter + 6 + badgeH / 2 + 1);

  // Caption block, bottom-left, slightly rotated like a poster sticker.
  const caption = (state.caption || 'SUNSET HEIST').toUpperCase();
  const sub = (state.subcaption || '').toUpperCase();
  const margin = W * 0.045;
  const maxTextW = W - margin * 2;
  const baseSize = H * 0.115 * (state.captionScale ?? 1);
  ctx.save();
  ctx.translate(margin, H - H * 0.055);
  ctx.rotate(-0.028);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const size = captionFontSize(ctx, caption, maxTextW, baseSize);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.75)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeStyle = 'rgba(12, 4, 22, 0.95)';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(caption, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = state.captionColor || '#ffd166';
  ctx.fillText(caption, 0, 0);
  if (sub) {
    const subSize = Math.max(14, Math.round(size * 0.2));
    ctx.font = `${subSize}px 'Archivo Black', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.lineWidth = subSize * 0.28;
    ctx.strokeStyle = 'rgba(12, 4, 22, 0.95)';
    ctx.strokeText(sub, 2, -size * 1.12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, 2, -size * 1.12);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
  ctx.restore();
}
