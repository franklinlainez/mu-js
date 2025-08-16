import si from 'systeminformation';
import dotenv from 'dotenv';
import { IncomingWebhook } from '@slack/webhook';
import { getAndArchiveInactive } from './registerProcesses.js';

dotenv.config();

const _monitor = new IncomingWebhook(process.env.MONITOR_CHANNEL);
const disconnects = new IncomingWebhook(process.env.DISCONNECT_CHANNEL);

const PROCESS_NAME = process.env.PROCESS_NAME;

let prevMainCount = 0;

export async function reportGeneralStatus() {
  try {
    const [cpu, processes] = await Promise.all([
      si.currentLoad(),
      si.processes(),
    ]);

    const cpuLoad =
      cpu.cpus.reduce((sum, core) => sum + core.load, 0) / cpu.cpus.length;

    const mainProcesses = processes.list.filter((p) => p.name === PROCESS_NAME);
    const currentCount = mainProcesses.length;
    const mainCpuUsage = mainProcesses.reduce((sum, proc) => sum + proc.cpu, 0);

    await _monitor.send({
      text: `🖥️ Estado actual:
- Laptop: 1
- ${PROCESS_NAME} activos: ${currentCount}
- Uso CPU por ${PROCESS_NAME}: ${mainCpuUsage.toFixed(2)}%`.trim(),
    });

    console.log(
      `[MONITOR] ${new Date().toISOString()} - CPU: ${cpuLoad.toFixed(
        2
      )}%, main.exe: ${currentCount}`
    );
  } catch (err) {
    console.error('❌ Error en reporte general:', err);
  }
}

export async function reportDisconnects(charNamesWithAcc: string[] = []) {
  try {
    await disconnects.send({
      text: `🚨 Desconexiones detectadas:
${charNamesWithAcc.join('\n')}
`,
    });
  } catch (err) {
    console.error('❌ Error en reporte de desconexiones:', err);
  }
}

export async function checkDisconnectsLocal() {
  try {
    const processes = await si.processes();
    const mainProcesses = processes.list.filter((p) => p.name === PROCESS_NAME);
    const currentCount = mainProcesses.length;

    if (currentCount < prevMainCount) {
      await disconnects.send({
        text: `⚠️ Cambio en procesos ${PROCESS_NAME}. Antes: ${prevMainCount}, Ahora: ${currentCount}`,
      });
      console.log(
        `[ALERTA] main.exe count changed: ${prevMainCount} → ${currentCount}`
      );
    }
    prevMainCount = currentCount;
    console.log('total procesos ' + currentCount);
  } catch (err) {
    console.error('❌ Error revisando desconexiones:', err);
  }
}

export const checkDisconnects = async () => {
  const inactiveDocs = await getAndArchiveInactive();
  if (inactiveDocs?.length) {
    const charNamesWithAcc = inactiveDocs.map(
      (doc) => `${doc.accountId} (${doc.accountId}) - Channel: ${doc.channel}`
    );
    await reportDisconnects(charNamesWithAcc);
  } else {
    console.log('No hay desconexiones para reportar.');
  }
};

// Ejecutar inmediatamsente al inicio
// reportGeneralStatus();
// checkDisconnects();
