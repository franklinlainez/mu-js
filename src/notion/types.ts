import type {
  CreatePageParameters,
  UpdatePageParameters,
} from '@notionhq/client';
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

export type DBMonitorProperty =
  | 'machineId'
  | 'processId'
  | 'channel'
  | 'accountId'
  | 'status'
  | 'imagen';

export type DBActionsProperty = 'name' | 'isActive';
export type Status = 'ACTIVE' | 'INACTIVE';

type NotionCreateProps = NonNullable<CreatePageParameters['properties']>;
type NotionUpdateProps = NonNullable<UpdatePageParameters['properties']>;

type NotionCreatePropValue = NotionCreateProps[string];
type NotionUpdatePropValue = NotionUpdateProps[string];

export type NotionPageCreateInputParameters<
  T extends string | number | symbol
> = CreatePageParameters & {
  properties: CreatePageParameters['properties'] & {
    [K in T]?: NotionCreatePropValue;
  };
};

export type NotionPageUpdateInputParameters<
  T extends string | number | symbol
> = UpdatePageParameters & {
  properties: UpdatePageParameters['properties'] & {
    [K in T]?: NotionUpdatePropValue;
  };
};

type FullPage = PageObjectResponse;
export type PagePropValue = FullPage['properties'][string];
export type OfValueType<T extends PagePropValue['type']> = Extract<
  PagePropValue,
  { type: T }
>;
export type WithTypedProps<M extends Record<string, PagePropValue>> = Omit<
  FullPage,
  'properties'
> & {
  properties: FullPage['properties'] & { [K in keyof M]?: M[K] };
};

export type TypedQueryDatabaseResponse<
  M extends Record<string, PagePropValue>
> = Omit<QueryDatabaseResponse, 'results'> & {
  results: Array<WithTypedProps<M>>;
};

export function isFullPage(
  r: QueryDatabaseResponse['results'][number]
): r is PageObjectResponse {
  return r.object === 'page' && 'properties' in r;
}

export function narrowQueryResponse<M extends Record<string, PagePropValue>>(
  resp: QueryDatabaseResponse
): TypedQueryDatabaseResponse<M> {
  const results = resp.results.filter(isFullPage) as Array<WithTypedProps<M>>;
  const { results: _ignore, ...rest } = resp;
  return { ...rest, results };
}

type CreateProps = NonNullable<CreatePageParameters['properties']>;
type CreateProp = CreateProps[string];
type ReqOf<K extends PropertyKey> = Extract<CreateProp, Record<K, any>>;

type CreateRequestForValue<V extends PagePropValue> = V extends {
  type: 'rich_text';
}
  ? ReqOf<'rich_text'>
  : V extends { type: 'checkbox' }
  ? ReqOf<'checkbox'>
  : V extends { type: 'files' }
  ? ReqOf<'files'>
  : V extends { type: 'select' }
  ? ReqOf<'select'>
  : V extends { type: 'status' }
  ? ReqOf<'status'>
  : V extends { type: 'number' }
  ? ReqOf<'number'>
  : V extends { type: 'date' }
  ? ReqOf<'date'>
  : V extends { type: 'url' }
  ? ReqOf<'url'>
  : V extends { type: 'people' }
  ? ReqOf<'people'>
  : V extends { type: 'multi_select' }
  ? ReqOf<'multi_select'>
  : never;

export type TypedCreateParams<M extends Record<string, PagePropValue>> = Omit<
  CreatePageParameters,
  'properties'
> & {
  // permitimos TODAS las props oficiales + tus claves tipadas,
  // y las tuyas son opcionales
  properties: CreateProps &
    Partial<{
      [K in keyof M & string]: CreateRequestForValue<M[K]>;
    }>;
};

// ---- Update ----
type UpdateProps = NonNullable<UpdatePageParameters['properties']>;
type UpdateProp = UpdateProps[string];
type UReqOf<K extends PropertyKey> = Extract<UpdateProp, Record<K, any>>;

type UpdateRequestForValue<V extends PagePropValue> = V extends {
  type: 'rich_text';
}
  ? UReqOf<'rich_text'>
  : V extends { type: 'checkbox' }
  ? UReqOf<'checkbox'>
  : V extends { type: 'files' }
  ? UReqOf<'files'>
  : V extends { type: 'select' }
  ? UReqOf<'select'>
  : V extends { type: 'status' }
  ? UReqOf<'status'>
  : V extends { type: 'number' }
  ? UReqOf<'number'>
  : V extends { type: 'date' }
  ? UReqOf<'date'>
  : V extends { type: 'url' }
  ? UReqOf<'url'>
  : V extends { type: 'people' }
  ? UReqOf<'people'>
  : V extends { type: 'multi_select' }
  ? UReqOf<'multi_select'>
  : never;

export type TypedUpdateParams<M extends Record<string, PagePropValue>> = Omit<
  UpdatePageParameters,
  'properties'
> & {
  properties: Partial<{
    [K in keyof M & string]: UpdateRequestForValue<M[K]>;
  }>;
};
