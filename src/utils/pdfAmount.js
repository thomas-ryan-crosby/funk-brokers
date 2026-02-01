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

const extractAmountCandidates = (text) => {
  if (!text) return [];
  const candidates = [];
  const pattern = /(?:\$|usd\s*)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,})(?:\.\d{2})?/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1] || '';
    const normalized = raw.replace(/,/g, '');
    const value = Number.parseFloat(normalized);
    if (Number.isNaN(value) || value < MIN_AMOUNT || value > MAX_AMOUNT) continue;
    const start = Math.max(0, match.index - 60);
    const end = Math.min(text.length, match.index + 120);
    const context = text.slice(start, end).replace(/\s+/g, ' ').trim();
    candidates.push({ value, raw, context });
  }
  return candidates;
};

const classifyAmount = (context) => {
  const ctx = (context || '').toLowerCase();
  if (/(loan amount|amount of your loan|amount of loan|loan is|amount is)/.test(ctx)) return 'loan_amount';
  if (/(purchase price|contract price|sales price|price of the property)/.test(ctx)) return 'purchase_price';
  if (/(down payment|downpayment)/.test(ctx)) return 'down_payment';
  if (/(interest only payment|principal and interest|monthly payment)/.test(ctx)) return 'payment';
  if (/(nmls|nmls id)/.test(ctx)) return 'nmls_id';
  return 'other';
};

const scoreCandidate = (candidate) => {
  const classification = classifyAmount(candidate.context);
  const scores = {
    loan_amount: 100,
    purchase_price: 90,
    down_payment: 70,
    payment: 40,
    nmls_id: -100,
    other: 0,
  };
  const base = scores[classification] ?? 0;
  return { ...candidate, classification, score: base };
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
    const candidates = extractAmountCandidates(fullText).map(scoreCandidate);
    const sorted = candidates.sort((a, b) => b.score - a.score || b.value - a.value);

    console.groupCollapsed('[pdf-amount] extraction candidates');
    console.table(sorted.map(({ value, raw, classification, score, context }) => ({
      value,
      raw,
      classification,
      score,
      context,
    })));
    console.groupEnd();

    const best = sorted.find((c) => c.classification !== 'nmls_id') || sorted[0];
    if (!best) return null;
    return best.value || (allAmounts.length ? Math.max(...allAmounts) : null);
  } catch (error) {
    console.error('Failed to extract PDF amount:', error);
    return null;
  }
};
