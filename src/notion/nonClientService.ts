// nonClientServices.js
import axios from 'axios';
import FormData from 'form-data';
import { NOTION_TOKEN } from '../config.js';

const NOTION_VERSION = '2022-06-28';

export async function createFileUpload(
  filename: string,
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
  return data;
}

export async function sendFileUploadFromBuffer(
  uploadId: string,
  buffer: Buffer | Uint8Array,
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

export async function uploadFromBuffer(
  buffer: Buffer | Uint8Array,
  {
    filename,
    contentType = 'application/octet-stream',
  }: { filename: string; contentType?: string }
) {
  const fu = await createFileUpload(filename, contentType);
  await sendFileUploadFromBuffer(fu.id, buffer, { filename, contentType });
  return { uploadId: fu.id, filename };
}
