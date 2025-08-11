import { notion } from './client.js';
import { NOTION_DATABASE_ID } from '../config.js';
import { PROPERTIES, STATUS } from './constants.js';

/**
 * @typedef {Object} ProcessItem
 * @property {string} id - Notion page id
 * @property {string} machineId
 * @property {string} processId
 * @property {string} channel
 * @property {string} accountId
 * @property {string} status
 */

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
 * @returns {Promise<ProcessItem[]>}
 */
export async function archiveInactive(existingResults, activePids) {
  const promises = [];
  const inactiveDocuments = [];
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
      inactiveDocuments.push(page);
    }
  }
  await Promise.all(promises);
  /** @type {ProcessItem[]} */
  const items = inactiveDocuments.map((page) => {
    const props = page.properties;
    return /** @type {ProcessItem} */ ({
      id: page.id,
      machineId: props[PROPERTIES.MACHINE_ID].rich_text[0]?.plain_text || '',
      processId: props[PROPERTIES.PROCESS_ID].rich_text[0]?.plain_text || '',
      channel: props[PROPERTIES.CHANNEL].rich_text[0]?.plain_text || '',
      accountId: props[PROPERTIES.ACCOUNT_ID].rich_text[0]?.plain_text || '',
      status: props[PROPERTIES.STATUS].select?.name || '',
    });
  });
  return items;
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
export async function createRecord(
  machineId,
  pidStr,
  channel,
  accountId,
  fileName,
  uploadId
) {
  const data = {
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
  };
  if (fileName && uploadId) {
    data.properties[PROPERTIES.IMAGE] = {
      files: [
        {
          name: fileName,
          type: 'file_upload',
          file_upload: { id: uploadId },
        },
      ],
    };
  }
  return notion.pages.create(data);
}

/**
 * Update an existing process record
 */
export async function updateRecord(
  pageId,
  channel,
  accountId,
  fileName,
  uploadId
) {
  const data = {
    page_id: pageId,
    properties: {
      [PROPERTIES.CHANNEL]: { rich_text: [{ text: { content: channel } }] },
      [PROPERTIES.ACCOUNT_ID]: {
        rich_text: [{ text: { content: accountId } }],
      },
      [PROPERTIES.STATUS]: { select: { name: STATUS.ACTIVE } },
    },
  };
  if (fileName && uploadId) {
    data.properties[PROPERTIES.IMAGE] = {
      files: [
        {
          name: fileName,
          type: 'file_upload',
          file_upload: { id: uploadId },
        },
      ],
    };
  }
  return notion.pages.update(data);
}

export async function attachFileUploadToPage(
  pageId,
  uploadId,
  filename,
  fileProperty = PROPERTIES.IMAGE
) {
  return notion.pages.update({
    page_id: pageId,
    properties: {
      [fileProperty]: {
        files: [
          {
            name: filename,
            type: 'file_upload',
            file_upload: { id: uploadId },
          },
        ],
      },
    },
  });
}

export async function createRecordWithUpload({
  machineId,
  pidStr,
  channel,
  accountId,
  uploadId,
  filename,
  fileProperty = PROPERTIES.IMAGE,
}) {
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
      [fileProperty]: {
        files: [
          {
            name: filename,
            type: 'file_upload',
            file_upload: { id: uploadId },
          },
        ],
      },
    },
  });
}
