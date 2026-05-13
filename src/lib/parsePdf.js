// Lazy-loaded PDF text extraction using pdfjs-dist.
// Reconstructs lines from positioned text items so parseResumen.js (line-based) can consume the output.

let pdfjsPromise = null;

async function getPdfjs() {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
  })();
  return pdfjsPromise;
}

function reconstructLines(items, yTolerance = 2) {
  const rows = new Map();
  for (const it of items) {
    if (!it.str || !it.transform) continue;
    const y = Math.round(it.transform[5] / yTolerance) * yTolerance;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push(it);
  }
  // PDF Y origin is bottom-left → sort descending so top of page comes first.
  const sortedYs = [...rows.keys()].sort((a, b) => b - a);
  const lines = [];
  for (const y of sortedYs) {
    const row = rows.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
    let line = '';
    let prevEndX = null;
    for (const it of row) {
      const x = it.transform[4];
      // Use a double space when there's a clear column gap so parseResumen regex can split fields.
      if (prevEndX !== null && x - prevEndX > 2) line += '  ';
      else if (line && !line.endsWith(' ')) line += ' ';
      line += it.str;
      prevEndX = x + (it.width || 0);
    }
    const trimmed = line.replace(/\s+$/g, '');
    if (trimmed.length) lines.push(trimmed);
  }
  return lines.join('\n');
}

export async function extractTextFromPdf(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('El archivo no es un PDF válido.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('El PDF es demasiado grande. El límite es 15 MB.');
  }
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') {
      throw new Error('El PDF está protegido con contraseña.', { cause: e });
    }
    throw new Error('No se pudo abrir el PDF.', { cause: e });
  }
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(reconstructLines(content.items));
  }
  const text = pages.join('\n').trim();
  if (text.length < 20) {
    throw new Error('El PDF no contiene texto extraíble (puede ser un PDF escaneado).');
  }
  return text;
}
