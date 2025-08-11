import dotenv from 'dotenv';
import si from 'systeminformation';
import { Client } from '@notionhq/client';
import { IncomingWebhook } from '@slack/webhook';
import { ocrRegion } from './utils/ocrRegion.js';
import { ocrRegionsMap } from './constants.js';
import { execWinCommands } from './windows/commands.js';

dotenv.config();

// Configuración de Notion
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;
const machineId = process.env.MACHINE_ID || 'Laptop1';

// Webhooks de Slack
const monitorWebhook = new IncomingWebhook(process.env.MONITOR_CHANNEL);
const disconnectWebhook = new IncomingWebhook(process.env.DISCONNECT_CHANNEL);

// Parámetros
const MAIN_PROCESS_NAME = process.env.PROCESS_NAME || 'main.exe';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// Cola para notificaciones pendientes (por falta de internet, etc.)
let notificationQueue = [];

/**
 * Rutina 1: Registrar PIDs nuevos en Notion
 * 0) Archiva los registros existentes para esta machineId
 * 1) Obtener procesos main.exe activos
 * 2) Para cada PID nuevo, crear un row con machineId, processId y status ACTIVE
 */
async function registrarProcesos() {
  // 0. Archivar registros existentes
  const existing = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'machineId',
      rich_text: { equals: machineId },
    },
  });

  // 1. Obtener procesos activos
  const { list } = await si.processes();
  const mainProcs = list.filter((p) => p.name === MAIN_PROCESS_NAME);
  const activePids = mainProcs.map((p) => p.pid.toString());

  // 1.1. Marcar INACTIVE los que ya no están
  const inactivePromises = [];
  for (const page of existing.results) {
    const pagePid = page.properties.processId.rich_text[0]?.plain_text;
    const status = page.properties.status.select?.name;
    if (!activePids.includes(pagePid) && status !== 'INACTIVE') {
      inactivePromises.push(
        notion.pages.update({
          page_id: page.id,
          properties: { status: { select: { name: 'INACTIVE' } } },
        })
      );
    }
  }
  await Promise.all(inactivePromises);

  // 2. Consultar cuáles existen y cuáles no
  const queryPromises = mainProcs.map(async (proc) => {
    const pidStr = proc.pid.toString();
    const resp = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          { property: 'machineId', rich_text: { equals: machineId } },
          { property: 'processId', rich_text: { equals: pidStr } },
        ],
      },
    });
    return {
      pidStr,
      exists: resp.results.length > 0,
      pageId: resp.results[0]?.id,
    };
  });
  const queryResults = await Promise.all(queryPromises);

  const toCreate = queryResults.filter((r) => !r.exists).map((r) => r.pidStr);
  const toUpdate = queryResults.filter((r) => r.exists);

  // 3. Tomar foto de cada proceso activo
  for (const processId of activePids) {
    await execWinCommands(processId, 'enfocar_tomar_foto_ocultar');
  }

  // 4. Crear registros nuevos
  const createPromises = toCreate.map(async (pidStr) => {
    let [
      {
        data: { text: channelName },
      },
      {
        data: { text: charName },
      },
    ] = await Promise.all([
      ocrRegion('server', ocrRegionsMap.server, pidStr),
      ocrRegion('charName', ocrRegionsMap.charName, pidStr),
    ]);

    const match = channelName.match(/Arcadia-(\d+)/);
    if (match) channelName = match[1];
    charName = charName.trim();

    return notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        machineId: { rich_text: [{ text: { content: machineId } }] },
        processId: { rich_text: [{ text: { content: pidStr } }] },
        channel: { rich_text: [{ text: { content: channelName } }] },
        accountId: { rich_text: [{ text: { content: charName } }] },
        status: { select: { name: 'ACTIVE' } },
      },
    });
  });

  // 5. Actualizar registros existentes
  const updatePromises = toUpdate.map(async ({ pidStr, pageId }) => {
    let [
      {
        data: { text: channelName },
      },
      {
        data: { text: charName },
      },
    ] = await Promise.all([
      ocrRegion('server', ocrRegionsMap.server, pidStr),
      ocrRegion('charName', ocrRegionsMap.charName, pidStr),
    ]);

    const match = channelName.match(/Arcadia-(\d+)/);
    if (match) channelName = match[1];
    charName = charName.trim();

    return notion.pages.update({
      page_id: pageId,
      properties: {
        channel: { rich_text: [{ text: { content: channelName } }] },
        accountId: { rich_text: [{ text: { content: charName } }] },
        status: { select: { name: 'ACTIVE' } },
      },
    });
  });

  await Promise.all([...createPromises, ...updatePromises]);
}

// Procesar ambas regiones
// (async () => {
//   await ocrRegion('channel', regiones.charName);
//   await ocrRegion('charName', regiones.server);
// })();

// comandosCMD();
registrarProcesos();
// comandosCMD();
// comandosCMD();
