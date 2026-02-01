import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 100000000;

const parseCurrencyValues = (text) => {
  if (!text) return [];
  const results = [];
  const pattern = /(?:\$|usd\s*)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.\d{2})?/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1] || '';
    const normalized = raw.replace(/,/g, '');
    const value = Number.parseFloat(normalized);
    if (!Number.isNaN(value) && value >= MIN_AMOUNT && value <= MAX_AMOUNT) {
      results.push(value);
    }
  }
  return results;
};

const parseLooseAmounts = (text) => {
  if (!text) return [];
  const results = [];
  const pattern = /\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,})\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1] || '';
    const normalized = raw.replace(/,/g, '');
    const value = Number.parseFloat(normalized);
    if (!Number.isNaN(value) && value >= MIN_AMOUNT && value <= MAX_AMOUNT) {
      results.push(value);
    }
  }
  return results;
};

const parseKeywordAmounts = (text) => {
  if (!text) return [];
  const results = [];
  const keywords = [
    'approved',
    'pre-approval',
    'preapproval',
    'loan amount',
    'amount',
    'funds',
    'available',
    'verified',
    'credit',
  ];
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    const idx = lower.indexOf(keyword);
    if (idx === -1) continue;
    const windowText = text.slice(Math.max(0, idx - 40), idx + 160);
    results.push(...parseCurrencyValues(windowText));
    results.push(...parseLooseAmounts(windowText));
  }
  return results;
};

export const extractPdfAmount = async (file) => {
  try {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      fullText += ` ${pageText}`;
    }

    const allAmounts = [
      ...parseCurrencyValues(fullText),
      ...parseLooseAmounts(fullText),
      ...parseKeywordAmounts(fullText),
    ];
    if (!allAmounts.length) return null;
    return Math.max(...allAmounts);
  } catch (error) {
    console.error('Failed to extract PDF amount:', error);
    return null;
  }
};
