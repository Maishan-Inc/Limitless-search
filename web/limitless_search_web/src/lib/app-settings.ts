import "server-only";

import { allRows, checkDatabase, firstRow, mutate, runStatement, scalar, toBooleanValue, toNumber, toStringValue } from "@/lib/admin-db";
import {
  DEFAULT_ADMIN_PATH,
  settingDefinitions,
  type AppSettingDefinition,
  type SettingValue,
} from "@/lib/settings-definitions";

export { DEFAULT_ADMIN_PATH, settingDefinitions, type AppSettingDefinition, type SettingValue };

export type InstallState = {
  installed: boolean;
  setupRequired: boolean;
  licenseAcceptedAt: string | null;
  installedAt: string | null;
  adminPath: string;
  schemaVersion: number;
};

const definitions: AppSettingDefinition[] = Object.values(settingDefinitions);

const nowIso = () => new Date().toISOString();

const parseValue = (value: unknown) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as SettingValue;
    } catch {
      return value;
    }
  }
  return value as SettingValue;
};

export const normalizeAdminPath = (input: string) => {
  const trimmed = input.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || DEFAULT_ADMIN_PATH;
};

export const validateAdminPath = (input: string) => {
  const path = normalizeAdminPath(input);
  const reserved = ["/install", "/api", "/rankings", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

  if (!/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(path)) {
    return { ok: false as const, path, message: "Admin path can only use letters, numbers, slash, dash, and underscore." };
  }
  if (reserved.some((entry) => path === entry || path.startsWith(`${entry}/`))) {
    return { ok: false as const, path, message: "Admin path conflicts with a reserved route." };
  }
  return { ok: true as const, path };
};

export const seedDefaultSettings = async () => {
  await mutate(async (db) => {
    for (const definition of definitions) {
      await runStatement(
        db,
        `
        INSERT INTO app_settings (key, value_json, is_secret, category, updated_at, updated_by_admin_id)
        VALUES (?, ?::jsonb, ?, ?, ?, NULL)
        ON CONFLICT (key) DO NOTHING
        `,
        [
          definition.key,
          JSON.stringify(definition.defaultValue),
          Boolean(definition.secret),
          definition.category,
          nowIso(),
        ],
      );
    }
  });
};

export const getSettingValue = async <T extends SettingValue>(
  definition: AppSettingDefinition<T>,
): Promise<T> => {
  await seedDefaultSettings();
  const row = await firstRow("SELECT value_json FROM app_settings WHERE key = ? LIMIT 1", [definition.key]);
  if (!row) return definition.defaultValue;
  return parseValue(row.value_json) as T;
};

export const getSettingMap = async () => {
  await seedDefaultSettings();
  return allRows("SELECT key, value_json, is_secret, category, updated_at FROM app_settings ORDER BY category ASC, key ASC");
};

export const getAllSettings = async (options?: { maskSecrets?: boolean }) => {
  await seedDefaultSettings();
  const rows = await allRows("SELECT key, value_json, is_secret, category, updated_at FROM app_settings ORDER BY category ASC, key ASC");
  return rows.map((row) => {
    const isSecret = toBooleanValue(row.is_secret);
    return {
      key: toStringValue(row.key),
      category: toStringValue(row.category),
      value: isSecret && options?.maskSecrets ? "" : parseValue(row.value_json),
      isSecret,
      updatedAt: toStringValue(row.updated_at),
    };
  });
};

export const updateSettingValues = async (
  values: Record<string, SettingValue>,
  options?: { adminId?: number | null; preserveBlankSecrets?: boolean },
) => {
  const definitionMap = new Map(definitions.map((definition) => [definition.key, definition]));
  const timestamp = nowIso();

  await mutate(async (db) => {
    for (const [key, value] of Object.entries(values)) {
      const definition = definitionMap.get(key);
      if (!definition) continue;
      if (definition.secret && options?.preserveBlankSecrets && (value === "" || value === null)) {
        continue;
      }

      await runStatement(
        db,
        `
        INSERT INTO app_settings (key, value_json, is_secret, category, updated_at, updated_by_admin_id)
        VALUES (?, ?::jsonb, ?, ?, ?, ?)
        ON CONFLICT (key) DO UPDATE
        SET value_json = EXCLUDED.value_json,
            is_secret = EXCLUDED.is_secret,
            category = EXCLUDED.category,
            updated_at = EXCLUDED.updated_at,
            updated_by_admin_id = EXCLUDED.updated_by_admin_id
        `,
        [
          key,
          JSON.stringify(value),
          Boolean(definition.secret),
          definition.category,
          timestamp,
          options?.adminId || null,
        ],
      );

      await runStatement(
        db,
        `
        INSERT INTO setting_audit_logs (setting_key, category, changed_at, changed_by_admin_id, value_preview)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          key,
          definition.category,
          timestamp,
          options?.adminId || null,
          definition.secret ? "[secret]" : JSON.stringify(value).slice(0, 280),
        ],
      );
    }
  });
};

export const getAdminPath = async () => {
  const value = await getSettingValue(settingDefinitions.adminPath);
  return normalizeAdminPath(String(value || DEFAULT_ADMIN_PATH));
};

export const getInstallState = async (): Promise<InstallState> => {
  await seedDefaultSettings();
  const [stateRow, adminCountValue, adminPath] = await Promise.all([
    firstRow("SELECT * FROM install_state WHERE id = 1 LIMIT 1"),
    scalar("SELECT COUNT(*) AS count FROM admin_users"),
    getAdminPath(),
  ]);

  const adminCount = toNumber(adminCountValue);
  const installedAt = stateRow?.installed_at ? toStringValue(stateRow.installed_at) : null;
  const licenseAcceptedAt = stateRow?.license_accepted_at ? toStringValue(stateRow.license_accepted_at) : null;
  const installed = Boolean(installedAt && licenseAcceptedAt && adminCount > 0 && adminPath);

  return {
    installed,
    setupRequired: !installed,
    licenseAcceptedAt,
    installedAt,
    adminPath,
    schemaVersion: stateRow ? toNumber(stateRow.schema_version) : 1,
  };
};

export const completeInstallState = async (input: {
  adminPath: string;
  adminId: number;
}) => {
  const timestamp = nowIso();
  await updateSettingValues(
    {
      [settingDefinitions.adminPath.key]: input.adminPath,
    },
    { adminId: input.adminId },
  );

  await mutate(async (db) => {
    await runStatement(
      db,
      `
      INSERT INTO install_state (id, license_accepted_at, installed_at, schema_version, admin_path, updated_at)
      VALUES (1, ?, ?, 1, ?, ?)
      ON CONFLICT (id) DO UPDATE
      SET license_accepted_at = EXCLUDED.license_accepted_at,
          installed_at = EXCLUDED.installed_at,
          admin_path = EXCLUDED.admin_path,
          updated_at = EXCLUDED.updated_at
      `,
      [timestamp, timestamp, input.adminPath, timestamp],
    );
  });
};

export const getEnvironmentChecks = async () => {
  const checks = [
    {
      key: "node",
      label: "Node runtime",
      ok: true,
      detail: `Node ${process.version}`,
    },
  ];

  try {
    const ok = await checkDatabase();
    checks.push({
      key: "postgres",
      label: "PostgreSQL",
      ok,
      detail: ok ? "Database connection and schema are ready." : "Database check failed.",
    });
  } catch (error) {
    checks.push({
      key: "postgres",
      label: "PostgreSQL",
      ok: false,
      detail: error instanceof Error ? error.message : "Database check failed.",
    });
  }

  try {
    const state = await getInstallState();
    checks.push({
      key: "install_state",
      label: "Install state",
      ok: true,
      detail: state.installed ? `Installed at ${state.installedAt}.` : "Setup is ready to run.",
    });
  } catch (error) {
    checks.push({
      key: "install_state",
      label: "Install state",
      ok: false,
      detail: error instanceof Error ? error.message : "Install state check failed.",
    });
  }

  return checks;
};
