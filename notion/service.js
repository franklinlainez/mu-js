import { notion } from './client.js';
import { NOTION_DATABASE_ID } from '../config.js';
import { PROPERTIES, STATUS } from './constants.js';

/**
 * Query all records for a given machineId
 */
export async function queryExisting(machineId) {
  return notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: PROPERTIES.MACHINE_ID,
      rich_text: { equals: machineId },
    },
  });
}

/**
 * Mark processes not in activePids as INACTIVE
 */
export async function archiveInactive(existingResults, activePids) {
  const promises = [];
  for (const page of existingResults.results) {
    const pagePid =
      page.properties[PROPERTIES.PROCESS_ID].rich_text[0]?.plain_text;
    const status = page.properties[PROPERTIES.STATUS].select?.name;
    if (!activePids.includes(pagePid) && status !== STATUS.INACTIVE) {
      promises.push(
        notion.pages.update({
          page_id: page.id,
          properties: {
            [PROPERTIES.STATUS]: { select: { name: STATUS.INACTIVE } },
          },
        })
      );
    }
  }
  await Promise.all(promises);
}

/**
 * Find single process record by machineId and pid
 */
export async function findProcessRecord(machineId, pidStr) {
  const resp = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      and: [
        { property: PROPERTIES.MACHINE_ID, rich_text: { equals: machineId } },
        { property: PROPERTIES.PROCESS_ID, rich_text: { equals: pidStr } },
      ],
    },
  });
  return resp.results[0] || null;
}

/**
 * Create a new record for a process
 */
export async function createRecord(machineId, pidStr, channel, accountId) {
  return notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      [PROPERTIES.MACHINE_ID]: {
        rich_text: [{ text: { content: machineId } }],
      },
      [PROPERTIES.PROCESS_ID]: { rich_text: [{ text: { content: pidStr } }] },
      [PROPERTIES.CHANNEL]: { rich_text: [{ text: { content: channel } }] },
      [PROPERTIES.ACCOUNT_ID]: {
        rich_text: [{ text: { content: accountId } }],
      },
      [PROPERTIES.STATUS]: { select: { name: STATUS.ACTIVE } },
    },
  });
}

/**
 * Update an existing process record
 */
export async function updateRecord(pageId, channel, accountId) {
  return notion.pages.update({
    page_id: pageId,
    properties: {
      [PROPERTIES.CHANNEL]: { rich_text: [{ text: { content: channel } }] },
      [PROPERTIES.ACCOUNT_ID]: {
        rich_text: [{ text: { content: accountId } }],
      },
      [PROPERTIES.STATUS]: { select: { name: STATUS.ACTIVE } },
    },
  });
}
