import { notion } from './client.js';
import {
  NOTION_MONITOR_DATABASE_ID,
  NOTION_ACTIONS_DATABASE_ID,
} from '../config.js';
import { STATUS } from './constants.js';
import type {
  CreatePageParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import type {
  DBActionsProperty,
  DBMonitorProperty,
  NotionPageCreateInputParameters,
  NotionPageUpdateInputParameters,
  TypedQueryDatabaseResponse,
} from './types.js';
import type { DBActionsFields, DBMonitorFields } from './schemas.js';

/**
 * @typedef {Object} ProcessItem
 * @property {string} id - Notion page id
 * @property {string} machineId
 * @property {string} processId
 * @property {string} channel
 * @property {string} accountId
 * @property {string} status
 */

const _actions = {
  results: [
    {
      id: 'example-id',
      properties: {
        // DB_ACTIONS_PROPERTIES
      },
    },
  ],
};

// actionItem:

/**
 * @typedef {Object} ActionItem
 * @property {string} id - Notion page id
 * @property {string} name - Action name
 * @property {boolean} isActive - Whether the action is active
 */

export async function getActions() {
  return notion.typedQuery<DBActionsFields>({
    database_id: NOTION_ACTIONS_DATABASE_ID,
  });
}

export async function queryExisting(machineId: string) {
  return notion.typedQuery<DBMonitorFields>({
    database_id: NOTION_MONITOR_DATABASE_ID,
    filter: {
      property: 'machineId',
      rich_text: { equals: machineId },
    },
  });
}

export async function archiveInactive(
  existingResults: TypedQueryDatabaseResponse<DBMonitorFields>,
  activePids: string[]
) {
  const promises = [];
  const inactiveDocuments = [];
  for (const page of existingResults.results) {
    const pagePid = page.properties.processId?.rich_text[0]?.plain_text;
    const status = page.properties.status?.select?.name;
    if (!activePids.includes(pagePid || '') && status !== STATUS.INACTIVE) {
      promises.push(
        notion.typedUpdate<DBMonitorFields>({
          page_id: page.id,
          properties: {
            status: {
              select: { name: STATUS.INACTIVE },
            },
          },
        })
      );
      inactiveDocuments.push(page);
    }
  }
  await Promise.all(promises);
  const items = inactiveDocuments.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      machineId: props.machineId?.rich_text[0]?.plain_text || '',
      processId: props.processId?.rich_text[0]?.plain_text || '',
      channel: props.channel?.rich_text[0]?.plain_text || '',
      accountId: props.accountId?.rich_text[0]?.plain_text || '',
      status: props.status?.select?.name || '',
    };
  });
  return items;
}

/**
 * Find single process record by machineId and pid
 */
export async function findProcessRecord(
  machineId: string,
  pidStr: string
): Promise<QueryDatabaseResponse['results'][number] | null> {
  const resp = await notion.typedQuery<DBMonitorFields>({
    database_id: NOTION_MONITOR_DATABASE_ID,
    filter: {
      and: [
        {
          property: 'machineId',
          rich_text: { equals: machineId },
        },
        {
          property: 'processId',
          rich_text: { equals: pidStr },
        },
      ],
    },
  });
  return resp?.results?.[0] || null;
}

/**
 * Create a new record for a process
 */
export async function createRecord(
  machineId: string,
  pidStr: string,
  channel: string,
  accountId: string,
  fileName?: string,
  uploadId?: string
) {
  const data: NotionPageCreateInputParameters<DBMonitorProperty> = {
    parent: { database_id: NOTION_MONITOR_DATABASE_ID },
    properties: {
      machineId: {
        rich_text: [{ text: { content: machineId } }],
      },
      processId: {
        rich_text: [{ text: { content: pidStr } }],
      },
      channel: {
        rich_text: [{ text: { content: channel } }],
      },
      accountId: {
        rich_text: [{ text: { content: accountId } }],
      },
      status: { select: { name: STATUS.ACTIVE } },
    },
  };
  if (fileName && uploadId) {
    data.properties.imagen = {
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
  pageId: string,
  channel: string,
  accountId: string,
  fileName?: string,
  uploadId?: string
) {
  const data: NotionPageUpdateInputParameters<DBMonitorProperty> = {
    page_id: pageId,
    properties: {
      channel: {
        rich_text: [{ text: { content: channel } }],
      },
      accountId: {
        rich_text: [{ text: { content: accountId } }],
      },
      status: { select: { name: STATUS.ACTIVE } },
    },
  };
  if (fileName && uploadId) {
    data.properties.imagen = {
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
