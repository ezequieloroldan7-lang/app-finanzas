// Parse Argentine credit card/bank statement text into expense rows.
// Handles formats from Visa, Mastercard, Naranja X, BBVA, Santander, Galicia,
// and bank consumos with DD-Mon-YY dates and coupon-number columns.

const MONTHS_ES = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
};

function parseArsAmount(str) {
  // "1.234,56" → 1234.56   "1234,56" → 1234.56   "1234.56" → 1234.56
  const s = str.trim().replace(/\$/g, '').trim();
  if (s.includes(',')) {
    // Could be "1.234,56" (thousands dot, decimal comma) or "1234,56"
    const dotIdx = s.lastIndexOf('.');
    const commaIdx = s.lastIndexOf(',');
    if (dotIdx < commaIdx) {
      // dot is thousands separator → remove dots, replace comma with dot
      return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    }
    // comma is thousands separator → remove commas
    return parseFloat(s.replace(/,/g, ''));
  }
  // plain dot decimal or integer
  return parseFloat(s.replace(/\./g, '') || '0') || parseFloat(s);
}

function parseArDate(str) {
  // DD-Mon-YY or DD-Mon-YYYY  (Spanish month abbreviation, e.g. 19-Nov-25)
  const mEs = str.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/);
  if (mEs) {
    const month = MONTHS_ES[mEs[2].toLowerCase()];
    if (!month) return null;
    const year = mEs[3].length === 2 ? '20' + mEs[3] : mEs[3];
    return `${year}-${month}-${mEs[1].padStart(2, '0')}`;
  }
  // Numeric: DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY
  const sep = str.includes('/') ? '/' : '-';
  const parts = str.split(sep);
  if (parts.length < 3) return null;
  const [d, m, y] = parts;
  const year = y.length === 2 ? '20' + y : y;
  const month = m.padStart(2, '0');
  const day = d.padStart(2, '0');
  if (parseInt(month) < 1 || parseInt(month) > 12) return null;
  if (parseInt(day) < 1 || parseInt(day) > 31) return null;
  return `${year}-${month}-${day}`;
}

// Try to detect cuota info from description fragments like "C.05/06", "1/3", "CTA 1 DE 3"
function extractCuotas(text) {
  const m =
    text.match(/\bC\.?\s*(\d+)\s*\/\s*(\d+)\b/) ||          // C.05/06 or C05/06
    text.match(/\bCUOTA[S]?\s*(\d+)\s*(?:DE|\/)\s*(\d+)\b/i) ||
    text.match(/\bCTA\.?\s*(\d+)\s*(?:DE|\/)\s*(\d+)\b/i) ||
    text.match(/\b(\d+)\s*\/\s*(\d+)\b/);
  if (m) {
    const current = parseInt(m[1]);
    const total = parseInt(m[2]);
    if (total >= current && total > 1 && total <= 60) return total;
  }
  return 1;
}

function cleanDescription(desc) {
  return desc
    .replace(/\bC\.?\s*\d+\s*\/\s*\d+\b/gi, '')             // C.05/06
    .replace(/\bCUOTA[S]?\s*\d+\s*(?:DE|\/)\s*\d+\b/gi, '')
    .replace(/\bCTA\.?\s*\d+\s*(?:DE|\/)\s*\d+\b/gi, '')
    .replace(/\b\d+\s*\/\s*\d+\b/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseResumen(text) {
  const results = [];

  // ── Regex patterns (ordered most-specific → least) ────────────────────────

  // Pattern A: DD/MM/YY[YY] or DD-Mon-YY[YY]   DESCRIPTION   $1.234,56
  // Handles numeric dates AND Spanish-month dates; takes second amount when present.
  const patA =
    /^(\d{1,2}[-\/](?:\d{1,2}|[A-Za-z]{3})[-\/]\d{2,4})\s{1,6}(.{3,60?}?)\s{2,}(?:\$\s*)?([\d.,]+)(?:\s+(?:\$\s*)?([\d.,]+))?$/;

  // Pattern B: DESCRIPTION   DD/MM/YY[YY]   $1.234,56  (some banks put date after)
  const patB =
    /^(.{3,50?}?)\s{2,}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s{2,}(?:\$\s*)?([\d.,]+)$/;

  // Pattern C: DD-Mon-YY   DESCRIPTION [C.XX/XX]   COUPON(5-8 digits)   PESOS [DOLARES]
  // Targets bank statements with a coupon-number column (Galicia, ICBC, etc.).
  // Works with both PDF-extracted text (double spaces) and copy-pasted text (single spaces).
  // Coupon is anchored as 5-8 pure digits to avoid matching numbers inside descriptions.
  const patC =
    /^(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s+(.+?)\s+(\d{5,8})\s+([\d.,]+)(?:\s+([\d.,]+))?$/;

  const lines = text
    .split('\n')
    .map(l => l.trim().replace(/\s{3,}/g, '  '))
    .filter(l => l.length > 6);

  for (const line of lines) {
    // Skip obvious header/footer lines
    if (/^(fecha|date|descripci|concepto|monto|importe|total|saldo|debe|haber|debito|credito|nro\.?|cup[oó]n|consumos\b)/i.test(line)) continue;
    if (/^[=\-*─]+$/.test(line)) continue;

    let date = null;
    let description = '';
    let amount = 0;
    let cuotas = 1;
    let currency = 'ARS';

    const mA = line.match(patA);
    if (mA) {
      date = parseArDate(mA[1]);
      description = mA[2].trim();
      // When two amounts present take the second (usually the ARS pesos equivalent)
      amount = parseArsAmount(mA[4] || mA[3]);
      cuotas = extractCuotas(description);
      description = cleanDescription(description);
    } else {
      const mB = line.match(patB);
      if (mB) {
        description = mB[1].trim();
        date = parseArDate(mB[2]);
        amount = parseArsAmount(mB[3]);
        cuotas = extractCuotas(description);
        description = cleanDescription(description);
      } else {
        const mC = line.match(patC);
        if (mC) {
          date = parseArDate(mC[1]);
          const rawDesc = mC[2].trim();
          cuotas = extractCuotas(rawDesc);

          // Detect USD transactions: description contains "USD" keyword
          const isUsd = /\bUSD\b/.test(rawDesc);
          currency = isUsd ? 'USD' : 'ARS';

          // Remove trailing embedded amount from description column (e.g. "USD  2,99")
          const descStripped = isUsd
            ? rawDesc.replace(/\s+[\d.,]+\s*$/, '')
            : rawDesc;
          description = cleanDescription(descStripped);

          const amt1 = parseArsAmount(mC[4]);
          const amt2 = mC[5] ? parseArsAmount(mC[5]) : null;

          if (amt2 !== null) {
            // Two amounts: first=PESOS, second=DOLARES.
            // If it's a USD-only charge, PESOS column is 0 and DOLARES has the value.
            amount = (isUsd || amt1 === 0) ? amt2 : amt1;
          } else {
            amount = amt1;
          }
        }
      }
    }

    if (!date || !description || amount <= 0 || amount > 50_000_000) continue;
    if (description.length < 2) continue;

    // The statement shows the per-installment amount; recover the original purchase total.
    const totalAmount = cuotas > 1 ? amount * cuotas : amount;

    results.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount: totalAmount,
      currency,
      totalCuotas: cuotas,
      tna: 0,
      exchangeRate: null,
    });
  }

  return results;
}
