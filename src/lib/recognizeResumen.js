// Auto-recognize metadata from PDF bank statements and invoices using regex fallback.
// Note: AI-assisted recognition requires the ai-proxy serverless function to be configured.
import { extractTextFromPdf } from './parsePdf';

function fallbackResumen(text) {
  const result = { month: '', amount: '', cardName: '' };
  const monthEs = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  const mText = text.match(/(?:per[íi]odo|resumen|vencimiento)[:\s]+([A-Za-záéíóú]+)\s+(\d{4})/i);
  if (mText) {
    const mon = monthEs[mText[1].toLowerCase()];
    if (mon) result.month = `${mText[2]}-${mon}`;
  }
  if (!result.month) {
    const mNum = text.match(/(?:per[íi]odo|resumen)[:\s]+(\d{2})[\/\-](\d{4})/i);
    if (mNum) result.month = `${mNum[2]}-${mNum[1]}`;
  }
  const mAmt = text.match(/(?:total\s+a\s+pagar|importe\s+total|saldo\s+total)[:\s]+\$?\s*([\d.,]+)/i);
  if (mAmt) {
    const raw = mAmt[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) result.amount = String(Math.round(n));
  }
  const cardMatch = text.match(/\b(Visa|Mastercard|Naranja|American Express|AMEX|Cabal|Maestro)\b/i);
  if (cardMatch) result.cardName = cardMatch[1];
  return result;
}

function fallbackFactura(text) {
  const result = { service: '', amount: '', date: '' };
  const mAmt = text.match(/(?:total\s+a\s+pagar|importe\s+total|total\s+factura|monto\s+total)[:\s]+\$?\s*([\d.,]+)/i);
  if (mAmt) {
    const raw = mAmt[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) result.amount = String(Math.round(n));
  }
  // Date: DD/MM/YYYY or YYYY-MM-DD
  const mDate = text.match(/(?:fecha\s+vto\.?|vencimiento|fecha)[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
  if (mDate) {
    const y = mDate[3].length === 2 ? '20' + mDate[3] : mDate[3];
    result.date = `${y}-${mDate[2].padStart(2, '0')}-${mDate[1].padStart(2, '0')}`;
  }
  // Service: look for common Argentine utilities
  const svc = text.match(/\b(Metrogas|Edesur|Edenor|Aysa|Telecentro|Personal|Movistar|Claro|DirecTV|Flow|Fibertel|Cablevision)\b/i);
  if (svc) result.service = svc[1];
  return result;
}

async function extractText(file) {
  return extractTextFromPdf(file);
}

export async function recognizeResumen(file) {
  let text = '';
  try {
    text = await extractText(file);
  } catch (e) {
    return { month: '', amount: '', cardName: '', error: e.message || 'No se pudo leer el PDF.' };
  }

  // AI recognition via proxy is not yet implemented for this flow.
  // Falls back to regex-based extraction.
  console.error('[recognizeResumen] AI recognition requires api/ai-proxy.js to be configured for PDF parsing.');
  return { ...fallbackResumen(text), error: null };
}

export async function recognizeFactura(file) {
  let text = '';
  try {
    text = await extractText(file);
  } catch (e) {
    return { service: '', amount: '', date: '', error: e.message || 'No se pudo leer el PDF.' };
  }

  // AI recognition via proxy is not yet implemented for this flow.
  // Falls back to regex-based extraction.
  console.error('[recognizeFactura] AI recognition requires api/ai-proxy.js to be configured for PDF parsing.');
  const today = new Date().toISOString().slice(0, 10);
  const fb = fallbackFactura(text);
  return {
    service: fb.service || '',
    amount: fb.amount || '',
    date: fb.date || today,
    error: null,
  };
}
