// Export a rendered chart (Recharts SVG) as a PNG or JPEG image — fully
// client-side, no dependencies. Computed styles are inlined onto a clone so
// the exported image matches what is on screen (colours, fonts, etc.).

function safeFilename(title) {
  return String(title || 'chart')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STYLE_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray',
  'font-size', 'font-weight', 'font-family', 'opacity', 'color', 'text-anchor'
];

function inlineStyles(source, target) {
  const sList = [source, ...source.querySelectorAll('*')];
  const tList = [target, ...target.querySelectorAll('*')];
  for (let i = 0; i < sList.length; i += 1) {
    const cs = window.getComputedStyle(sList[i]);
    let style = '';
    STYLE_PROPS.forEach((p) => {
      const v = cs.getPropertyValue(p);
      if (v) style += `${p}:${v};`;
    });
    tList[i].setAttribute('style', style);
  }
}

// node: a DOM element that contains the chart <svg>. format: 'png' | 'jpeg'.
export function exportChartImage(node, baseName, format = 'png') {
  if (!node) return;
  const svg = node.querySelector('svg');
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const clone = svg.cloneNode(true);
  inlineStyles(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);

  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    const scale = 2; // crisp, retina-quality export
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff'; // white background (needed for JPEG)
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, `${safeFilename(baseName)}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    }, mime, 0.95);
  };
  img.onerror = () => alert('Could not export this chart as an image.');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}
