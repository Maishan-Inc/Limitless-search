/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");

const port = process.env.PORT || "3200";
const databaseUrl = process.env.DATABASE_URL || "";
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
let lastRunKey = "";

const parseSettingValue = (value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const getSettingMap = async () => {
  if (!pool) return new Map();

  const result = await pool.query(
    "SELECT key, value_json FROM app_settings WHERE key = ANY($1)",
    [[
      "rankings.enabled",
      "rankings.run_at",
      "rankings.timezone",
      "rankings.run_on_startup",
      "rankings.sync_token",
    ]],
  );

  return new Map(result.rows.map((row) => [row.key, parseSettingValue(row.value_json)]));
};

const getRankingSchedulerConfig = async () => {
  try {
    const settings = await getSettingMap();
    return {
      enabled: settings.get("rankings.enabled") === true,
      runAt: String(settings.get("rankings.run_at") || "03:00"),
      timeZone: String(settings.get("rankings.timezone") || "Asia/Shanghai"),
      runOnStartup: settings.get("rankings.run_on_startup") === true,
      token: String(settings.get("rankings.sync_token") || ""),
    };
  } catch (error) {
    console.warn("[rankings] scheduler settings unavailable", error);
    return {
      enabled: false,
      runAt: "03:00",
      timeZone: "Asia/Shanghai",
      runOnStartup: false,
      token: "",
    };
  }
};

const currentClock = (timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeKey: `${parts.hour}:${parts.minute}`,
  };
};

const triggerSync = async (reason, token) => {
  if (!token) {
    console.warn("[rankings] skipped sync: rankings.sync_token missing");
    return;
  }

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/rankings/sync`, {
      method: "POST",
      headers: {
        "x-rankings-token": token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[rankings] sync failed (${response.status}): ${text}`);
      return;
    }
    console.log(`[rankings] sync success (${reason}): ${text}`);
  } catch (error) {
    console.error("[rankings] sync error", error);
  }
};

require("./server.js");

setTimeout(async () => {
  const config = await getRankingSchedulerConfig();
  if (config.enabled && config.runOnStartup) {
    await triggerSync("startup", config.token);
  }
}, 15000);

setInterval(async () => {
  const config = await getRankingSchedulerConfig();
  if (!config.enabled) {
    return;
  }

  const { dateKey, timeKey } = currentClock(config.timeZone);
  if (timeKey !== config.runAt || lastRunKey === dateKey) {
    return;
  }

  lastRunKey = dateKey;
  await triggerSync("schedule", config.token);
}, 30000);
