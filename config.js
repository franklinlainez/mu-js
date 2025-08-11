import dotenv from 'dotenv';

dotenv.config();

// Notion configuration
export const NOTION_TOKEN = process.env.NOTION_TOKEN;
export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
export const MACHINE_ID = process.env.MACHINE_ID;

// Slack configuration
export const MONITOR_CHANNEL = process.env.MONITOR_CHANNEL;
export const DISCONNECT_CHANNEL = process.env.DISCONNECT_CHANNEL;

// Process monitoring
export const MAIN_PROCESS_NAME = process.env.PROCESS_NAME;
export const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR;
