// Lazy-loaded Tesseract.js wrapper — only initialises when first called.
// Dynamic import keeps it out of the main bundle.

let workerPromise = null;

async function getWorker() {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('spa');
    return worker;
  })();
  return workerPromise;
}

export async function extractTextFromImage(file) {
  const worker = await getWorker();
  const { data: { text } } = await worker.recognize(file);
  return text;
}

// Extract amount + description heuristics from OCR'd text
export function parseOcrResult(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let description = '';
  let amount = 0;

  // Find the largest plausible ARS amount in the text
  const amountPattern = /\$?\s*([\d.,]+)/g;
  let best = 0;
  for (const line of lines) {
    let m;
    while ((m = amountPattern.exec(line)) !== null) {
      const raw = m[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(raw);
      if (num > best && num < 50_000_000) best = num;
    }
  }
  amount = best;

  // Use the first non-numeric line as description
  for (const line of lines) {
    if (!/^[\d\s$.,]+$/.test(line) && line.length > 2) {
      description = line
        .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '')
        .replace(/\$[\d.,]+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 60);
      if (description.length > 2) break;
    }
  }

  return { description, amount };
}

export async function terminateOcrWorker() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch { /* noop */ } finally {
    workerPromise = null;
  }
}
