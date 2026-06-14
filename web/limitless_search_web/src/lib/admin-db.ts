import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

type SqlParam = string | number | boolean | null;
type SqlRow = Record<string, unknown>;

export type PgClient = Pool | PoolClient;

const schema = `
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS ranking_versions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  created_by_email TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS ranking_lists (
  id BIGSERIAL PRIMARY KEY,
  version_id BIGINT NOT NULL REFERENCES ranking_versions(id) ON DELETE CASCADE,
  list_key TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ranking_items (
  id BIGSERIAL PRIMARY KEY,
  list_id BIGINT NOT NULL REFERENCES ranking_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  query TEXT NOT NULL,
  title TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  display_time TEXT,
  source_url TEXT,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  titles_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS install_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  license_accepted_at TIMESTAMPTZ,
  installed_at TIMESTAMPTZ,
  schema_version INTEGER NOT NULL DEFAULT 1,
  admin_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS setting_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL,
  category TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by_admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  value_preview TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_ranking_versions_status ON ranking_versions(status);
CREATE INDEX IF NOT EXISTS idx_ranking_lists_version_id ON ranking_lists(version_id);
CREATE INDEX IF NOT EXISTS idx_ranking_items_list_id ON ranking_items(list_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
`;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

const getDatabaseUrl = () =>
  process.env.DATABASE_URL ||
  "postgres://limitless:limitless@127.0.0.1:5432/limitless_search";

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: Number(process.env.DATABASE_POOL_MAX || 10),
    });
  }
  return pool;
};

export const translateSql = (sql: string) => {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
};

const normalizeRows = <T extends QueryResultRow>(rows: T[]): SqlRow[] =>
  rows.map((row) => ({ ...row }));

export const ensureSchema = async () => {
  if (!schemaReady) {
    schemaReady = getPool().query(schema).then(() => undefined);
  }
  return schemaReady;
};

const ensureAndTranslate = async (sql: string) => {
  await ensureSchema();
  return translateSql(sql);
};

export const query = async (sql: string, params: SqlParam[] = []) => {
  const translated = await ensureAndTranslate(sql);
  return getPool().query(translated, params);
};

export const allRows = async (sql: string, params: SqlParam[] = []) => {
  const result = await query(sql, params);
  return normalizeRows(result.rows);
};

export const firstRow = async (sql: string, params: SqlParam[] = []) => {
  const rows = await allRows(sql, params);
  return rows[0] || null;
};

export const scalar = async (sql: string, params: SqlParam[] = []) => {
  const row = await firstRow(sql, params);
  if (!row) return null;
  const firstKey = Object.keys(row)[0];
  return firstKey ? row[firstKey] : null;
};

export const mutate = async <T>(handler: (db: PoolClient) => T | Promise<T>) => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const runStatement = (db: PgClient, sql: string, params: SqlParam[] = []) =>
  db.query(translateSql(sql), params);

export const queryRows = async (db: PgClient, sql: string, params: SqlParam[] = []) => {
  const result = await db.query(translateSql(sql), params);
  return normalizeRows(result.rows);
};

export const queryFirstRow = async (db: PgClient, sql: string, params: SqlParam[] = []) => {
  const rows = await queryRows(db, sql, params);
  return rows[0] || null;
};

export const queryScalar = async (db: PgClient, sql: string, params: SqlParam[] = []) => {
  const row = await queryFirstRow(db, sql, params);
  if (!row) return null;
  const firstKey = Object.keys(row)[0];
  return firstKey ? row[firstKey] : null;
};

export const insertAndReturnId = async (
  db: PgClient,
  sql: string,
  params: SqlParam[] = [],
) => {
  const result = await db.query(`${translateSql(sql)} RETURNING id`, params);
  return toNumber(result.rows[0]?.id);
};

export const checkDatabase = async () => {
  await ensureSchema();
  const result = await getPool().query("SELECT NOW() AS now");
  return Boolean(result.rows[0]?.now);
};

export const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
};

export const toStringValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
};

export const toBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
};
