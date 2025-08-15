import { Client } from '@notionhq/client';
import { NOTION_TOKEN } from '../config.js';
import type {
  CreatePageParameters,
  PageObjectResponse,
  QueryDatabaseParameters,
  UpdatePageParameters,
} from '@notionhq/client/build/src/api-endpoints.js';
import {
  narrowQueryResponse,
  type PagePropValue,
  type TypedCreateParams,
  type TypedQueryDatabaseResponse,
  type TypedUpdateParams,
  type WithTypedProps,
} from './types.js';

type FilterForValue<V extends PagePropValue> = V extends { type: 'rich_text' }
  ? {
      rich_text: {
        equals?: string;
        does_not_equal?: string;
        contains?: string;
        does_not_contain?: string;
        starts_with?: string;
        ends_with?: string;
        is_empty?: boolean;
        is_not_empty?: boolean;
      };
    }
  : V extends { type: 'checkbox' }
  ? {
      checkbox: {
        equals?: boolean;
        does_not_equal?: boolean;
      };
    }
  : V extends { type: 'files' }
  ? {
      files: {
        is_empty?: boolean;
        is_not_empty?: boolean;
      };
    }
  : V extends { type: 'status' }
  ? {
      status: {
        equals?: string; // nombre o id
        does_not_equal?: string;
      };
    }
  : V extends { type: 'select' }
  ? {
      select: {
        equals?: string; // nombre o id
        does_not_equal?: string;
      };
    }
  : never;

// Un filtro “single” (property + predicado) tipado por tu mapa M
export type TypedSingleFilter<M extends Record<string, PagePropValue>> = {
  [K in keyof M & string]: { property: K } & FilterForValue<M[K]>;
}[keyof M & string];

// Composición AND/OR + timestamps, igual que Notion, pero tipado
export type TypedFilter<M extends Record<string, PagePropValue>> =
  | TypedSingleFilter<M>
  | { and: TypedFilter<M>[] }
  | { or: TypedFilter<M>[] };

// Sorts tipados: o por tus propiedades o por timestamps
export type TypedSort<M extends Record<string, PagePropValue>> =
  | { property: keyof M & string; direction: 'ascending' | 'descending' }
  | {
      timestamp: 'created_time' | 'last_edited_time';
      direction: 'ascending' | 'descending';
    };

// Parámetros de query con filter/sorts tipados
export type TypedQueryParams<M extends Record<string, PagePropValue>> = Omit<
  QueryDatabaseParameters,
  'filter' | 'sorts'
> & {
  database_id: string;
  filter?: TypedFilter<M>;
  sorts?: TypedSort<M>[];
};

// Guard para asegurar “full page”
function isFullPageObject(p: any): p is PageObjectResponse {
  return p?.object === 'page' && 'properties' in p;
}

// ---------- Cliente extendido ----------
export class NotionEx extends Client {
  async typedQuery<M extends Record<string, PagePropValue>>(
    params: TypedQueryParams<M>
  ): Promise<TypedQueryDatabaseResponse<M>> {
    const raw = await this.databases.query(params as QueryDatabaseParameters);
    return narrowQueryResponse<M>(raw);
  }

  // (opcional) Paginado automático
  public async typedQueryAll<M extends Record<string, PagePropValue>>(
    params: QueryDatabaseParameters & { database_id: string }
  ): Promise<Array<WithTypedProps<M>>> {
    let cursor: string | null | undefined = params.start_cursor;
    const acc: Array<WithTypedProps<M>> = [];
    do {
      const raw = await this.databases.query({
        ...params,
        start_cursor: cursor,
      });
      const page = narrowQueryResponse<M>(raw);
      acc.push(...page.results);
      cursor = page.next_cursor;
    } while (cursor);
    return acc;
  }

  async typedCreate<M extends Record<string, PagePropValue>>(
    params: TypedCreateParams<M>
  ): Promise<WithTypedProps<M>> {
    const created = await this.pages.create(params as CreatePageParameters);
    if (!isFullPageObject(created))
      throw new Error('Create did not return a full page');
    return created as WithTypedProps<M>;
  }

  async typedUpdate<M extends Record<string, PagePropValue>>(
    params: TypedUpdateParams<M>
  ): Promise<WithTypedProps<M>> {
    const updated = await this.pages.update({
      ...(params as UpdatePageParameters),
    });
    if (!isFullPageObject(updated))
      throw new Error('Update did not return a full page');
    return updated as WithTypedProps<M>;
  }
}

export const notion = new NotionEx({ auth: NOTION_TOKEN });
