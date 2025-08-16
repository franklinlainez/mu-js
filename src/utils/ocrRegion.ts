import sharp, { type Region } from 'sharp';
import Tesseract, { type RecognizeResult } from 'tesseract.js';
import { SCREENSHOTS_DIR } from '../config.js';

export async function ocrRegion(
  regionName: string,
  coords: Region,
  processId: string
): Promise<RecognizeResult> {
  try {
    const inputImage = `${SCREENSHOTS_DIR}${processId}.png`;
    const buffer = await sharp(inputImage)
      .extract(coords)
      .sharpen()
      .grayscale()
      .modulate({
        brightness: 1.1,
        // contrast: 2.5
      }) // más contraste

      // .toFile(outputFile); // guarda imagen recortada
      .toBuffer();

    const res = await Tesseract.recognize(buffer);

    if (!res) {
      throw new Error(`No se pudo realizar OCR en "${regionName}"`);
    }
    return res;
  } catch (err) {
    throw err;
  }
}
