/**
 * Realtime Optical Character Recognition (OCR) Service
 * Converts receipt photos from Camera or Gallery into raw text
 * with fallback redundancy, timeout protection, and OCR text sanitation.
 */

const OCR_KEYS = [
  'K82746487988957',
  'K87899142388957',
  'helloworld',
];

export interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
  processingTimeMs?: number;
}

/**
 * Sends a base64 encoded image to the optical OCR engine
 */
export async function performReceiptOCR(
  base64Data: string,
  options?: {
    language?: string;
    onProgress?: (status: string) => void;
  }
): Promise<OCRResult> {
  const startTime = Date.now();
  const lang = options?.language || 'eng';

  // Strip data prefix if present (e.g. data:image/jpeg;base64,)
  let cleanBase64 = base64Data;
  let mime = 'image/jpeg';
  if (base64Data.startsWith('data:')) {
    const parts = base64Data.split(',');
    const mimeMatch = parts[0].match(/data:(.*?);base64/);
    if (mimeMatch) mime = mimeMatch[1];
    cleanBase64 = parts[1] || '';
  }

  // Ensure base64 string is properly formatted with data uri for OCR.space
  const formattedDataUri = `data:${mime};base64,${cleanBase64}`;

  options?.onProgress?.('Connecting to Optical AI Engine...');

  for (let i = 0; i < OCR_KEYS.length; i++) {
    const key = OCR_KEYS[i];
    try {
      options?.onProgress?.(`Reading receipt text (Engine ${i + 1}/${OCR_KEYS.length})...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s safety timeout

      const formData = new URLSearchParams({
        apikey: key,
        base64Image: formattedDataUri,
        language: lang,
        isTable: 'true',
        OCREngine: '2', // Engine 2 is optimized for receipts, invoices and numbers
        scale: 'true',
        detectOrientation: 'true',
      });

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const json = await response.json();

      if (json.IsErroredOnProcessing) {
        const errorMsg = Array.isArray(json.ErrorMessage)
          ? json.ErrorMessage.join(', ')
          : json.ErrorMessage || 'Processing error';
        console.warn(`OCR Key ${key} error:`, errorMsg);
        continue;
      }

      if (json.ParsedResults && json.ParsedResults.length > 0) {
        const rawText = json.ParsedResults[0].ParsedText || '';
        if (rawText.trim().length > 0) {
          options?.onProgress?.('Receipt text extracted successfully!');
          return {
            success: true,
            text: sanitizeOCRText(rawText),
            processingTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`OCR Key ${key} timed out after 20s`);
      } else {
        console.warn(`OCR Key ${key} failed:`, err.message || err);
      }
    }
  }

  return {
    success: false,
    error: 'Could not extract text from the image. Please ensure the receipt is well-lit and legible, or paste the text.',
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Sanitizes and cleans up common optical scan artifacts
 * such as broken symbols, misplaced accents, or irregular spacing.
 */
export function sanitizeOCRText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let l = line.trim();
      // Replace non-standard currency approximations
      l = l.replace(/\b(?:PHP|Php|PhP)\b/g, '₱');
      // Normalize multiple spaces and tabs
      l = l.replace(/\t+/g, '    ');
      l = l.replace(/[ ]{2,}/g, '  ');
      return l;
    })
    .filter((line) => line.length > 0)
    .join('\n');
}
