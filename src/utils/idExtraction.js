import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min?url';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const cleanSpaces = (value) => value.replace(/\s+/g, ' ').trim();

const normalizeText = (value) =>
  cleanSpaces(
    value
      .replace(/[|]/g, ' ')
      .replace(/[^A-Za-z0-9/:\-\. ]+/g, ' ')
  );

const normalizeNameForCompare = (value) => (value || '').toLowerCase().replace(/[^a-z]/g, '');

const normalizeDobForCompare = (value) => {
  if (!value) return '';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const mdY = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdY) {
    const year = mdY[3].length === 2 ? `19${mdY[3]}` : mdY[3];
    return `${year}${mdY[1].padStart(2, '0')}${mdY[2].padStart(2, '0')}`;
  }
  return value.replace(/[^\d]/g, '');
};

const noiseNameTokens = new Set([
  'REST',
  'NONE',
  'SPN',
  'END',
  'CLASS',
  'DLN',
  'DOB',
  'EXP',
  'ISS',
  'EYES',
  'HAIR',
  'HGT',
  'WGT',
  'SEX',
  'DRIVER',
  'LICENSE',
  'USA',
  'POS',
  'ID',
]);

const cleanNameCandidate = (value) => {
  const normalized = (value || '').replace(/[^A-Za-z'\- ]+/g, ' ');
  const tokens = cleanSpaces(normalized)
    .split(' ')
    .filter((token) => token && !noiseNameTokens.has(token.toUpperCase()))
    .filter((token) => token !== '-' && token !== "'")
    .filter((token) => token.length > 1);
  if (tokens.length < 2) return null;
  return toTitleCase(tokens.join(' '));
};

const toTitleCase = (value) =>
  value
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');

const parseDob = (text) => {
  if (!text) return null;
  const normalized = normalizeText(text);
  const patterns = [
    /\b(?:dob|date of birth|birth)\b[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
    /\b(?:dob|date of birth|birth)\b[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2})/i,
    /\b([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})\b/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const value = match[1];
      const parts = value.split(/[\/\-]/);
      if (parts.length === 3 && parts[2].length === 2) {
        const year = parseInt(parts[2], 10);
        const currentYear = new Date().getFullYear() % 100;
        const century = year > currentYear ? 1900 : 2000;
        return `${parts[0]}/${parts[1]}/${century + year}`;
      }
      return value;
    }
  }

  const fallback = normalized.match(/\b([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/);
  if (fallback?.[1]) {
    const parts = fallback[1].split('/');
    if (parts.length === 3 && parts[2].length === 2) {
      const year = parseInt(parts[2], 10);
      const currentYear = new Date().getFullYear() % 100;
      const century = year > currentYear ? 1900 : 2000;
      return `${parts[0]}/${parts[1]}/${century + year}`;
    }
    return fallback[1];
  }

  return null;
};

const parseName = (text) => {
  if (!text) return null;
  const normalized = normalizeText(text);
  const cleaned = normalized.replace(/\b(REST|NONE|SPN|END|CLASS|DLN|DOB|EXP|ISS|EYES|HAIR|HGT|WGT|SEX|DRIVER|LICENSE|USA)\b/gi, '');
  const labeled = cleaned.match(/\b(?:name|full name)\b[:\s]*([A-Z][A-Z'\- ]{2,})/i);
  if (labeled?.[1]) return cleanNameCandidate(labeled[1]);

  // Common ID format: "1 LAST" and "2 FIRST MIDDLE"
  const idFormat = cleaned.match(/\b1\s*([A-Z'\-]+)\b.*?\b2\s*([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idFormat?.[1] && idFormat?.[2]) {
    return cleanNameCandidate(`${idFormat[2]} ${idFormat[1]}`);
  }

  const idLineFormat = cleaned.match(/\b([A-Z'\-]{2,})\b\s*(?:\||=|:)?\s*2\s+([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idLineFormat?.[1] && idLineFormat?.[2]) {
    return cleanNameCandidate(`${idLineFormat[2]} ${idLineFormat[1]}`);
  }

  const tokens = cleaned.split(' ');
  const getToken = (idx) => tokens[idx] || '';
  const pickNameFromTokens = () => {
    const idx1 = tokens.findIndex((t) => t === '1');
    const idx2 = tokens.findIndex((t) => t === '2');
    if (idx1 !== -1 && idx2 !== -1 && Math.abs(idx2 - idx1) <= 6) {
      const last = getToken(idx1 + 1);
      const first = getToken(idx2 + 1);
      const middle = getToken(idx2 + 2);
      if (last && first) {
        const nameParts = [first, middle, last].filter(Boolean);
        return cleanNameCandidate(nameParts.join(' '));
      }
    }
    return null;
  };

  const tokenName = pickNameFromTokens();
  if (tokenName) return tokenName;

  const nameBlock = cleaned.match(/\b([A-Z'\-]{2,})\s+([A-Z'\-]{2,})(?:\s+([A-Z'\-]{2,}))?\b/);
  if (nameBlock?.[1] && nameBlock?.[2]) {
    const last = nameBlock[1];
    const first = nameBlock[2];
    const middle = nameBlock[3] ? ` ${nameBlock[3]}` : '';
    if (!['REST', 'NONE', 'SPN', 'END', 'DRIVER', 'LICENSE', 'USA'].includes(last.toUpperCase())) {
      return cleanNameCandidate(`${first}${middle} ${last}`);
    }
  }

  return null;
};

const scoreOcrText = (text) => {
  const normalized = normalizeText(text);
  let score = 0;
  if (/DOB/i.test(normalized)) score += 5;
  if (/\b[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}\b/.test(normalized)) score += 5;
  if (/\b1\s+[A-Z]/.test(normalized) && /\b2\s+[A-Z]/.test(normalized)) score += 5;
  if (/DRIVER LICENSE|DLN/i.test(normalized)) score += 2;
  return score;
};

const runOcrVariants = async (file, variants) => {
  const results = [];
  for (const variant of variants) {
    const { data } = await Tesseract.recognize(file, 'eng', variant);
    const text = cleanSpaces(data?.text || '');
    results.push({
      text,
      score: scoreOcrText(text),
      variant,
      lines: (data?.lines || []).map((line) => line.text).filter(Boolean),
      blocks: (data?.blocks || []).map((block) => block.text).filter(Boolean),
      words: data?.words || [],
    });
  }
  return results;
};

const wordsToLeftToRight = (words) => {
  if (!words?.length) return '';
  const sorted = [...words].sort((a, b) => (a.bbox?.y0 || 0) - (b.bbox?.y0 || 0));
  const avgHeight = sorted.reduce((sum, word) => sum + ((word.bbox?.y1 || 0) - (word.bbox?.y0 || 0)), 0) / sorted.length || 12;
  const rowThreshold = Math.max(8, avgHeight * 0.8);
  const rows = [];
  sorted.forEach((word) => {
    const y = word.bbox?.y0 || 0;
    let row = rows.find((entry) => Math.abs(entry.y - y) <= rowThreshold);
    if (!row) {
      row = { y, words: [] };
      rows.push(row);
    }
    row.words.push(word);
  });
  rows.forEach((row) => row.words.sort((a, b) => (a.bbox?.x0 || 0) - (b.bbox?.x0 || 0)));
  rows.sort((a, b) => a.y - b.y);
  return rows.map((row) => row.words.map((word) => word.text).join(' ')).join('\n');
};

const getPdfText = async (file) => {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += ` ${pageText}`;
  }
  const text = cleanSpaces(fullText);
  return {
    text,
    views: {
      full: text,
      lines: text.split(/\n/).filter(Boolean),
      blocks: [],
      leftToRight: text,
    },
  };
};

const preprocessImage = (file, scale = 2) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas not supported'));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      v = Math.min(255, Math.max(0, (v - 128) * 1.25 + 128));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

const getImageText = async (file) => {
  const processed = await preprocessImage(file, 2);
  const variants = [
    { tessedit_pageseg_mode: 4, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/ -', preserve_interword_spaces: '1' },
    { tessedit_pageseg_mode: 6, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/ -', preserve_interword_spaces: '1' },
    { tessedit_pageseg_mode: 11, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/ -', preserve_interword_spaces: '1' },
  ];
  const rawResults = await runOcrVariants(processed, variants);
  const sorted = rawResults.sort((a, b) => b.score - a.score);

  console.groupCollapsed('[id-ocr] variant scores');
  console.table(sorted.map(({ score, text }) => ({ score, sample: text.slice(0, 80) })));
  console.groupEnd();

  const best = sorted[0];
  const text = best?.text || '';
  return {
    text,
    views: {
      full: text,
      lines: (best?.lines || []).map((line) => cleanSpaces(line)).filter(Boolean),
      blocks: (best?.blocks || []).map((block) => cleanSpaces(block)).filter(Boolean),
      leftToRight: cleanSpaces(wordsToLeftToRight(best?.words || [])),
    },
  };
};

const collectViewTexts = (views) => {
  const collected = [];
  if (views?.full) collected.push({ text: views.full, source: 'full' });
  if (views?.leftToRight) collected.push({ text: views.leftToRight, source: 'leftToRight' });
  (views?.lines || []).forEach((line, idx) => collected.push({ text: line, source: `line:${idx}` }));
  (views?.blocks || []).forEach((block, idx) => collected.push({ text: block, source: `block:${idx}` }));
  return collected;
};

const scoreNameCandidate = (value, baseScore, hints) => {
  let score = baseScore;
  if (!value) return -999;
  if (/\d/.test(value)) score -= 4;
  const tokens = value.split(' ').filter(Boolean);
  if (tokens.length >= 2 && tokens.length <= 4) score += 2;
  const normalized = normalizeNameForCompare(value);
  if (hints?.nameNormalized) {
    if (normalized === hints.nameNormalized) score += 12;
    if (hints.first && normalized.includes(hints.first)) score += 4;
    if (hints.last && normalized.includes(hints.last)) score += 4;
  }
  return score;
};

const scoreDobCandidate = (value, baseScore, context, hints) => {
  let score = baseScore;
  if (!value) return -999;
  if (context && /\b(exp|iss|issued)\b/i.test(context)) score -= 6;
  const normalized = normalizeDobForCompare(value);
  if (hints?.dobNormalized && normalized === hints.dobNormalized) score += 12;
  const year = parseInt(value.split(/[\/\-]/)[2] || '', 10);
  const currentYear = new Date().getFullYear();
  if (year && year >= 1900 && year <= currentYear - 16) score += 3;
  return score;
};

const extractNameCandidates = (text, source, hints) => {
  const candidates = [];
  if (!text) return candidates;
  const normalized = normalizeText(text);
  const labeled = normalized.match(/\b(?:name|full name)\b[:\s]*([A-Z][A-Z'\- ]{2,})/i);
  if (labeled?.[1]) {
    const value = cleanNameCandidate(labeled[1]);
    if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 10, hints), source, reason: 'label' });
  }
  const idFormat = normalized.match(/\b1\s*([A-Z'\-]+)\b.*?\b2\s*([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idFormat?.[1] && idFormat?.[2]) {
    const value = cleanNameCandidate(`${idFormat[2]} ${idFormat[1]}`);
    if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 8, hints), source, reason: '1/2 format' });
  }
  const idSymbolFormat = normalized.match(/\b([A-Z'\-]{2,})\b\s*(?:\||=|:)?\s*2\s+([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idSymbolFormat?.[1] && idSymbolFormat?.[2]) {
    const value = cleanNameCandidate(`${idSymbolFormat[2]} ${idSymbolFormat[1]}`);
    if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 9, hints), source, reason: 'symbol 2 format' });
  }
  const lastPipeFormat = normalized.match(/\b([A-Z'\-]{2,})\b\s*(?:\||=){1,2}\s*2\s+([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (lastPipeFormat?.[1] && lastPipeFormat?.[2]) {
    const value = cleanNameCandidate(`${lastPipeFormat[2]} ${lastPipeFormat[1]}`);
    if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 10, hints), source, reason: 'pipe 2 format' });
  }
  const idLineFormat = normalized.match(/\b([A-Z'\-]{2,})\b\s*(?:\||=|:)?\s*2\s+([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idLineFormat?.[1] && idLineFormat?.[2]) {
    const value = cleanNameCandidate(`${idLineFormat[2]} ${idLineFormat[1]}`);
    if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 7, hints), source, reason: 'line format' });
  }
  const tokens = normalized.split(' ');
  const idx1 = tokens.findIndex((t) => t === '1');
  const idx2 = tokens.findIndex((t) => t === '2');
  if (idx1 !== -1 && idx2 !== -1 && Math.abs(idx2 - idx1) <= 6) {
    const last = tokens[idx1 + 1];
    const first = tokens[idx2 + 1];
    const middle = tokens[idx2 + 2];
    const value = cleanNameCandidate([first, middle, last].filter(Boolean).join(' '));
    if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 6, hints), source, reason: 'token proximity' });
  }
  if (hints?.first && hints?.last) {
    const hintPattern = new RegExp(`\\b${hints.last.toUpperCase()}\\b[^\\n]{0,40}\\b2\\s+${hints.first.toUpperCase()}`, 'i');
    if (hintPattern.test(normalized)) {
      const value = cleanNameCandidate(`${hints.first} ${hints.last}`);
      if (value) candidates.push({ label: 'name', value, score: scoreNameCandidate(value, 14, hints), source, reason: 'hint proximity' });
    }
  }
  return candidates;
};

const extractDobCandidates = (text, source, hints) => {
  const candidates = [];
  if (!text) return candidates;
  const normalized = normalizeText(text);
  const labeled = normalized.match(/\b(?:dob|date of birth|birth)\b[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
  if (labeled?.[1]) {
    const value = parseDob(labeled[0]);
    if (value) candidates.push({ label: 'dob', value, score: scoreDobCandidate(value, 10, normalized, hints), source, reason: 'label' });
  }
  const generic = normalized.match(/\b([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})\b/);
  if (generic?.[1]) {
    const value = parseDob(generic[1]);
    if (value) candidates.push({ label: 'dob', value, score: scoreDobCandidate(value, 6, normalized, hints), source, reason: 'date pattern' });
  }
  return candidates;
};

const classifyIdText = (views, hints) => {
  const viewTexts = collectViewTexts(views);
  const nameCandidates = [];
  const dobCandidates = [];
  viewTexts.forEach(({ text, source }) => {
    nameCandidates.push(...extractNameCandidates(text, source, hints));
    dobCandidates.push(...extractDobCandidates(text, source, hints));
  });
  const bestName = [...nameCandidates].sort((a, b) => b.score - a.score)[0] || null;
  const bestDob = [...dobCandidates].sort((a, b) => b.score - a.score)[0] || null;
  return { nameCandidates, dobCandidates, bestName, bestDob };
};

export const extractGovernmentIdInfo = async (file, hints = {}) => {
  try {
    const isPdf = file.type === 'application/pdf';
    const { text, views } = isPdf ? await getPdfText(file) : await getImageText(file);
    const hintNameTokens = cleanSpaces((hints.name || '').toLowerCase().replace(/[^a-z ]/g, ' '))
      .split(' ')
      .filter(Boolean);
    const hintPayload = {
      nameNormalized: normalizeNameForCompare(hints.name),
      dobNormalized: normalizeDobForCompare(hints.dob),
      first: hintNameTokens[0],
      last: hintNameTokens[hintNameTokens.length - 1],
    };
    const classified = classifyIdText(views, hintPayload);
    const extractedName = classified.bestName?.value || parseName(text);
    const extractedDob = classified.bestDob?.value || parseDob(text);

    console.groupCollapsed('[id-ocr] raw text');
    console.log(text);
    console.groupEnd();

    console.groupCollapsed('[id-ocr] classification candidates');
    console.table(classified.nameCandidates.map((entry) => ({
      label: entry.label,
      value: entry.value,
      score: entry.score,
      reason: entry.reason,
      source: entry.source,
    })));
    console.table(classified.dobCandidates.map((entry) => ({
      label: entry.label,
      value: entry.value,
      score: entry.score,
      reason: entry.reason,
      source: entry.source,
    })));
    console.groupEnd();

    const candidates = [
      { label: 'name', value: extractedName, method: extractedName ? 'classified' : 'none' },
      { label: 'dob', value: extractedDob, method: extractedDob ? 'classified' : 'none' },
    ];

    console.groupCollapsed('[id-ocr] extraction results');
    console.table(candidates);
    console.groupEnd();

    return {
      extractedName,
      extractedDob,
      rawText: text,
    };
  } catch (error) {
    console.error('Failed to extract ID info:', error);
    return {
      extractedName: null,
      extractedDob: null,
      rawText: '',
    };
  }
};
