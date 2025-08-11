// nonClientServices.js
import axios from 'axios';
import FormData from 'form-data';
import { NOTION_TOKEN } from '../config.js';

const NOTION_VERSION = '2022-06-28';

/**
 * Crea un file_upload en Notion.
 * @param {string} filename - Nombre con extensión (ej. "1234.png")
 * @param {string} contentType - MIME (ej. "image/png")
 * @returns {Promise<{ id: string }>}
 */
export async function createFileUpload(
  filename,
  contentType = 'application/octet-stream'
) {
  const { data } = await axios.post(
    'https://api.notion.com/v1/file_uploads',
    { filename, content_type: contentType },
    {
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
    }
  );
  return data; // { id, ... }
}

/**
 * Envía el binario (buffer en memoria) al file_upload creado.
 * @param {string} uploadId
 * @param {Buffer|Uint8Array} buffer
 * @param {{ filename?: string, contentType?: string }} [opts]
 */
export async function sendFileUploadFromBuffer(
  uploadId,
  buffer,
  { filename = 'upload.bin', contentType = 'application/octet-stream' } = {}
) {
  const form = new FormData();
  // Nota: form-data admite Buffer/Uint8Array con nombre y tipo
  form.append('file', buffer, { filename, contentType });

  await axios.post(
    `https://api.notion.com/v1/file_uploads/${uploadId}/send`,
    form,
    {
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
    }
  );
}

/**
 * @param {Buffer|Uint8Array} buffer
 * @param {{ filename: string, contentType?: string }} opts
 */
export async function uploadFromBuffer(
  buffer,
  { filename, contentType = 'application/octet-stream' }
) {
  const fu = await createFileUpload(filename, contentType);
  await sendFileUploadFromBuffer(fu.id, buffer, { filename, contentType });
  return { uploadId: fu.id, filename };
}
