import { MONITOR_CHANNEL, DISCONNECT_CHANNEL } from './config.js';
import { IncomingWebhook } from '@slack/webhook';
import { registerProcesses } from './modules/registerProcesses.js';
import {
  reportGeneralStatus,
  checkDisconnectsLocal,
  reportDisconnects,
  checkDisconnects,
} from './modules/monitorProcesses.js';
import {
  createRecord,
  findProcessRecord,
  getActions,
  updateRecord,
} from './notion/service.js';

const MONITOR_INTERVAL_MS = 1 * 60 * 1000; // 30 minutos
const CHECK_INTERVAL_MS = 1 * 60 * 1000; // 5 minutos

// Initialize Slack webhooks
const monitorWebhook = new IncomingWebhook(MONITOR_CHANNEL);
const disconnectWebhook = new IncomingWebhook(DISCONNECT_CHANNEL);

// Queue for pending notifications
let notificationQueue = [];

// registerProcesses();

console.log('⏳ Iniciando monitoreo...');
// setInterval(reportGeneralStatus, MONITOR_INTERVAL_MS);
// setInterval(checkDisconnects, CHECK_INTERVAL_MS);
// checkDisconnects();

// getActions().then((actions) => {
//   actions.results[0].properties?.isActive?.type === 'checkbox' &&
//     // actions.results[0].properties?.isActive?.checkbox;
//     console.log('🔍 Acciones obtenidas:', JSON.stringify(actions, null, 2));
// });

createRecord('Laptop 2', '111111', '6', 'LOL');
