import si from 'systeminformation';
import { MACHINE_ID, MAIN_PROCESS_NAME, SCREENSHOTS_DIR } from '../config.js';
import { ocrRegionsMap } from '../constants.js';
import {
  archiveInactive,
  createRecord,
  findProcessRecord,
  queryExisting,
  updateRecord,
} from '../notion/service.js';
import { ocrRegion } from '../utils/ocrRegion.js';
import { execWinCommands } from '../windows/commands.js';
import { SCREENSHOTS_ACTIONS } from '../windows/constants.js';
import fs from 'fs/promises';
import { uploadFromBuffer } from '../notion/nonClientService.js';

/**
 * Perform OCR on regions and clean results
 */
async function getChannelAndAccount(pidStr) {
  const [
    {
      data: { text: rawChannel },
    },
    {
      data: { text: rawChar },
    },
  ] = await Promise.all([
    ocrRegion('server', ocrRegionsMap.server, pidStr),
    ocrRegion('charName', ocrRegionsMap.charName, pidStr),
  ]);
  const match = rawChannel.match(/Arcadia-(\d+)/);
  const channel = match ? match[1] : rawChannel.trim();
  const accountId = rawChar.trim();
  return { channel, accountId };
}

/**
 * Main routine: register processes in Notion
 */
export async function registerProcesses() {
  // 1. Query existing records and active processes
  const { list } = await si.processes();
  const activePids = list
    .filter((p) => p.name === MAIN_PROCESS_NAME)
    .map((p) => p.pid.toString());

  await getAndArchiveInactive();

  // 3. Prepare record matches
  const records = await Promise.all(
    activePids.map(async (pidStr) => {
      const rec = await findProcessRecord(MACHINE_ID, pidStr);
      return { pidStr, pageId: rec?.id };
    })
  );

  // 4. Capture screenshots
  for (const pid of activePids) {
    const x = await execWinCommands(
      pid,
      SCREENSHOTS_ACTIONS.ENFOCAR_TOMAR_FOTO_OCULTAR
    );
    console.log(x);
  }

  // 5. OCR and create/update operations
  const tasks = await Promise.all(
    records.map(async (r) => {
      const { channel, accountId } = await getChannelAndAccount(r.pidStr);
      const bytes = await fs.readFile(`${SCREENSHOTS_DIR}${r.pidStr}.png`);
      const { uploadId, filename } = await uploadFromBuffer(bytes, {
        filename: `${r.pidStr}.png`,
        contentType: 'image/png',
      });

      if (r.pageId) {
        return updateRecord(r.pageId, channel, accountId, filename, uploadId);
      } else {
        return createRecord(
          MACHINE_ID,
          r.pidStr,
          channel,
          accountId,
          filename,
          uploadId
        );
      }
    })
  );

  await Promise.all(tasks);
}

export async function getAndArchiveInactive() {
  try {
    const existing = await queryExisting(MACHINE_ID);
    const { list } = await si.processes();
    const activePids = list
      .filter((p) => p.name === MAIN_PROCESS_NAME)
      .map((p) => p.pid.toString());

    // 2. Archive inactive records
    return await archiveInactive(existing, activePids);
  } catch (err) {
    console.error('❌ Error revisando procesos:', err);
  }
}
