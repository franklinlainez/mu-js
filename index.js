import dotenv from 'dotenv';
import si from 'systeminformation';
import { Client } from '@notionhq/client';
import { IncomingWebhook } from '@slack/webhook';
import { exec } from 'child_process';
import { execa } from 'execa';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

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

  // Archivar o actualizar status a INACTIVE si el PID no está activo
  for (const page of existing.results) {
    const pagePid = page.properties.processId.rich_text[0]?.plain_text;
    const status = page.properties?.status?.select?.name;
    if (!activePids.includes(pagePid) && status !== 'INACTIVE') {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          status: { select: { name: 'INACTIVE' } },
        },
      });
    }
  }

  // 2. Crear registros nuevos (optimizado con Promise.all)
  // 2.1. Consultar en paralelo cuáles ya existen
  const queryPromises = mainProcs.map((proc) => {
    const pidStr = proc.pid.toString();
    return notion.databases
      .query({
        database_id: databaseId,
        filter: {
          and: [
            { property: 'machineId', rich_text: { equals: machineId } },
            { property: 'processId', rich_text: { equals: pidStr } },
          ],
        },
      })
      .then((resp) => ({ pidStr, exists: resp.results.length > 0 }));
  });

  const queryResults = await Promise.all(queryPromises);
  const toCreate = queryResults.filter((r) => !r.exists).map((r) => r.pidStr);

  // 2.2. Crear los que no existen en paralelo
  const createPromises = toCreate.map((pidStr) =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        machineId: { rich_text: [{ text: { content: machineId } }] },
        processId: { rich_text: [{ text: { content: pidStr } }] },
        status: { select: { name: 'ACTIVE' } },
      },
    })
  );
  await Promise.all(createPromises);
}

async function comandosCMD() {
  const { stdout } = await execa(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      'C:\\Users\\Frank\\screenshots.ps1',
      '-Action',
      'enfocar_tomar_foto',
      '-ProcessId',
      '41572',
      '-OutputDir',
      'C:\\Users\\Frank\\MU',
    ],
    { stdio: 'inherit' }
  );
  console.log(stdout);
}

// comandosCMD();
// registrarProcesos();

const inputImage = 'C:\\Users\\Frank\\MU\\41572.png'; // tu imagen

// Definimos las regiones de interés
const regiones = {
  charName: {
    left: 240,
    top: 130,
    width: 150,
    height: 40,
  },
  server: { left: 265, top: 360, width: 200, height: 40 },
};

// OCR de una región específica
async function ocrRegion(regionName, coords) {
  try {
    const outputFile = `debug_${regionName}.png`;
    const buffer = await sharp(inputImage)
      .extract(coords)
      .sharpen()
      .grayscale()
      .modulate({ brightness: 1.1, contrast: 2.5 }) // más contraste
      .toFile(outputFile); // guarda imagen recortada

    await Tesseract.recognize(outputFile).then((result) =>
      console.log(
        `OCR completado para "${regionName}". Texto detectado: ${result.data.text.trim()}`
      )
    );
  } catch (err) {
    console.error(`Error procesando "${regionName}":`, err);
  }
}

// Procesar ambas regiones
(async () => {
  await ocrRegion('channel', regiones.charName);
  await ocrRegion('charName', regiones.server);
})();

// comandosCMD();
