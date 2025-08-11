import { MONITOR_CHANNEL, DISCONNECT_CHANNEL } from './config.js';
import { IncomingWebhook } from '@slack/webhook';
import { registerProcesses } from './modules/registerProcesses.js';
import {
  reportGeneralStatus,
  checkDisconnectsLocal,
  reportDisconnects,
  checkDisconnects,
} from './modules/monitorProcesses.js';

const MONITOR_INTERVAL_MS = 1 * 60 * 1000; // 30 minutos
const CHECK_INTERVAL_MS = 1 * 60 * 1000; // 5 minutos

// Initialize Slack webhooks
const monitorWebhook = new IncomingWebhook(MONITOR_CHANNEL);
const disconnectWebhook = new IncomingWebhook(DISCONNECT_CHANNEL);

// Queue for pending notifications
let notificationQueue = [];

registerProcesses();

console.log('⏳ Iniciando monitoreo...');
// setInterval(reportGeneralStatus, MONITOR_INTERVAL_MS);
// setInterval(checkDisconnects, CHECK_INTERVAL_MS);
// checkDisconnects();
