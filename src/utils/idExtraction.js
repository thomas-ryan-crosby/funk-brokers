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
  if (labeled?.[1]) return toTitleCase(cleanSpaces(labeled[1]));

  // Common ID format: "1 LAST" and "2 FIRST MIDDLE"
  const idFormat = cleaned.match(/\b1\s*([A-Z'\-]+)\b.*?\b2\s*([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idFormat?.[1] && idFormat?.[2]) {
    return toTitleCase(cleanSpaces(`${idFormat[2]} ${idFormat[1]}`));
  }

  const idLineFormat = cleaned.match(/\b([A-Z'\-]{2,})\b\s*(?:\||=|:)?\s*2\s+([A-Z'\-]+(?:\s+[A-Z'\-]+)*)/i);
  if (idLineFormat?.[1] && idLineFormat?.[2]) {
    return toTitleCase(cleanSpaces(`${idLineFormat[2]} ${idLineFormat[1]}`));
  }

  const tokens = cleaned.split(' ');
  const getToken = (idx) => tokens[idx] || '';
  const pickNameFromTokens = () => {
    const idx1 = tokens.findIndex((t) => t === '1');
    const idx2 = tokens.findIndex((t) => t === '2');
    if (idx1 !== -1 && idx2 !== -1) {
      const last = getToken(idx1 + 1);
      const first = getToken(idx2 + 1);
      const middle = getToken(idx2 + 2);
      if (last && first) {
        const nameParts = [first, middle, last].filter(Boolean);
        return toTitleCase(cleanSpaces(nameParts.join(' ')));
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
      return toTitleCase(cleanSpaces(`${first}${middle} ${last}`));
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
    results.push({ text, score: scoreOcrText(text), variant });
  }
  return results;
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
  return cleanSpaces(fullText);
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

  return sorted[0]?.text || '';
};

export const extractGovernmentIdInfo = async (file) => {
  try {
    const isPdf = file.type === 'application/pdf';
    const text = isPdf ? await getPdfText(file) : await getImageText(file);
    const extractedName = parseName(text);
    const extractedDob = parseDob(text);

    console.groupCollapsed('[id-ocr] raw text');
    console.log(text);
    console.groupEnd();

    const candidates = [
      { label: 'name', value: extractedName, method: extractedName ? 'pattern' : 'none' },
      { label: 'dob', value: extractedDob, method: extractedDob ? 'pattern' : 'none' },
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
