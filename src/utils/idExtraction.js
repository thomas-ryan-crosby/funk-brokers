import { getPdfjs } from './pdfjsLoader';
import Tesseract from 'tesseract.js';

const cleanSpaces = (value) => value.replace(/\s+/g, ' ').trim();

const toTitleCase = (value) =>
  value
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');

const parseDob = (text) => {
  if (!text) return null;
  const patterns = [
    /\b(?:dob|date of birth|birth)\b[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
    /\b([0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

const parseName = (text) => {
  if (!text) return null;
  const match = text.match(/\b(?:name|full name)\b[:\s]*([A-Z][A-Z'\- ]{2,})/i);
  if (match?.[1]) {
    return toTitleCase(cleanSpaces(match[1]));
  }
  return null;
};

const getPdfText = async (file) => {
  const data = await file.arrayBuffer();
  const pdfjsLib = await getPdfjs();
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

const getImageText = async (file) => {
  const { data } = await Tesseract.recognize(file, 'eng');
  return cleanSpaces(data?.text || '');
};

export const extractGovernmentIdInfo = async (file) => {
  try {
    const isPdf = file.type === 'application/pdf';
    const text = isPdf ? await getPdfText(file) : await getImageText(file);
    const extractedName = parseName(text);
    const extractedDob = parseDob(text);
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
