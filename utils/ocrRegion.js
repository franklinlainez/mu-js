import sharp from 'sharp';
import Tesseract from 'tesseract.js';

/**
 * Extracts a region from an image and performs OCR on it.
 * @param {string} regionName - Name of the region to be processed.
 * @param {Object} coords - Coordinates of the region to be extracted.
 * @param {string} processId - Identifier for the process (usually the PID).
 */
export async function ocrRegion(regionName, coords, processId) {
  try {
    const outputFile = `debug_${regionName}.png`;
    const inputImage = `C:\\Users\\Frank\\MU\\${processId}.png`;
    const buffer = await sharp(inputImage)
      .extract(coords)
      .sharpen()
      .grayscale()
      .modulate({ brightness: 1.1, contrast: 2.5 }) // más contraste

      // .toFile(outputFile); // guarda imagen recortada
      .toBuffer();

    return await Tesseract.recognize(buffer);
  } catch (err) {
    console.error(`Error procesando "${regionName}":`, err);
  }
}
