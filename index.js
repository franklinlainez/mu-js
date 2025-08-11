// index.js - Refactored
import {
  MAIN_PROCESS_NAME,
  CHECK_INTERVAL_MS,
  MONITOR_CHANNEL,
  DISCONNECT_CHANNEL,
  MACHINE_ID,
} from './config.js';
import si from 'systeminformation';
import { ocrRegion } from './utils/ocrRegion.js';
import { ocrRegionsMap } from './constants.js';
import { execWinCommands } from './windows/commands.js';
import {
  queryExisting,
  archiveInactive,
  findProcessRecord,
  createRecord,
  updateRecord,
} from './notion/service.js';
import { IncomingWebhook } from '@slack/webhook';

// Initialize Slack webhooks
const monitorWebhook = new IncomingWebhook(MONITOR_CHANNEL);
const disconnectWebhook = new IncomingWebhook(DISCONNECT_CHANNEL);

// Queue for pending notifications
let notificationQueue = [];

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
export async function registrarProcesos() {
  // 1. Query existing records and active processes
  const existing = await queryExisting(MACHINE_ID);
  const { list } = await si.processes();
  const activePids = list
    .filter((p) => p.name === MAIN_PROCESS_NAME)
    .map((p) => p.pid.toString());

  // 2. Archive inactive records
  await archiveInactive(existing, activePids);

  // 3. Prepare record matches
  const records = await Promise.all(
    activePids.map(async (pidStr) => {
      const rec = await findProcessRecord(MACHINE_ID, pidStr);
      return { pidStr, pageId: rec?.id };
    })
  );

  // 4. Capture screenshots
  for (const pid of activePids) {
    await execWinCommands(pid, 'enfocar_tomar_foto_ocultar');
  }

  // 5. OCR and create/update operations
  const tasks = await Promise.all(
    records.map(async (r) => {
      const { channel, accountId } = await getChannelAndAccount(r.pidStr);
      if (r.pageId) {
        return updateRecord(r.pageId, channel, accountId);
      } else {
        return createRecord(MACHINE_ID, r.pidStr, channel, accountId);
      }
    })
  );

  await Promise.all(tasks);
}

// Initial execution and scheduling
registrarProcesos();
// setInterval(registrarProcesos, CHECK_INTERVAL_MS);
