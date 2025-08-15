import type { OfValueType } from './types.js';

export type DBMonitorFields = {
  machineId: OfValueType<'rich_text'>;
  processId: OfValueType<'rich_text'>;
  channel: OfValueType<'rich_text'>;
  accountId: OfValueType<'rich_text'>;
  status: OfValueType<'select'>;
  imagen: OfValueType<'files'>;
};
export type DBMonitorPropertyKeys = keyof DBMonitorFields;

export enum DBMonitorPropertyEnum {
  machineId = 'machineId',
  processId = 'processId',
  channel = 'channel',
  accountId = 'accountId',
  status = 'status',
  imagen = 'imagen',
}

export type DBActionsFields = {
  name: OfValueType<'rich_text'>;
  isActive: OfValueType<'checkbox'>;
};

export const DB_ACTIONS_PROPERTIES = {
  ACTION_NAME: 'name',
  IS_ACTIVE: 'isActive',
};
