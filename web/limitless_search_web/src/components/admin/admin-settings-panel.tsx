"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { settingDefinitions, type SettingValue } from "@/lib/settings-definitions";

type SettingRow = {
  key: string;
  category: string;
  value: SettingValue;
  isSecret: boolean;
  updatedAt: string;
};

type AdminSettingsPanelProps = {
  settings: SettingRow[];
  adminBasePath: string;
};

const groups = [
  {
    key: "ai",
    title: "AI API",
    fields: [
      settingDefinitions.aiSuggestEnabled.key,
      settingDefinitions.aiSuggestBaseUrl.key,
      settingDefinitions.aiSuggestModel.key,
      settingDefinitions.aiSuggestApiKey.key,
      settingDefinitions.aiSuggestThreshold.key,
      settingDefinitions.aiSuggestRequireCaptcha.key,
      settingDefinitions.rankingsBaseUrl.key,
      settingDefinitions.rankingsModel.key,
      settingDefinitions.rankingsApiKey.key,
    ],
  },
  {
    key: "captcha",
    title: "Captcha",
    fields: [
      settingDefinitions.captchaProvider.key,
      settingDefinitions.turnstileSiteKey.key,
      settingDefinitions.turnstileSecretKey.key,
      settingDefinitions.hcaptchaSiteKey.key,
      settingDefinitions.hcaptchaSecretKey.key,
    ],
  },
  {
    key: "rankings",
    title: "Ranking Automation",
    fields: [
      settingDefinitions.rankingsEnabled.key,
      settingDefinitions.rankingsNavEnabled.key,
      settingDefinitions.rankingsRunAt.key,
      settingDefinitions.rankingsTimezone.key,
      settingDefinitions.rankingsRunOnStartup.key,
      settingDefinitions.rankingsMinItems.key,
      settingDefinitions.rankingsSyncToken.key,
      settingDefinitions.rankingsDataDir.key,
    ],
  },
  {
    key: "prompts",
    title: "Prompts",
    fields: [
      settingDefinitions.aiSuggestPrompt.key,
      settingDefinitions.promptYearly.key,
      settingDefinitions.promptMonthly.key,
      settingDefinitions.promptDaily.key,
      settingDefinitions.promptModeration.key,
      settingDefinitions.promptTranslate.key,
      settingDefinitions.promptScore.key,
      settingDefinitions.promptVerify.key,
    ],
  },
  {
    key: "core",
    title: "Core Runtime",
    fields: [
      settingDefinitions.adminPath.key,
      settingDefinitions.coreChannels.key,
      settingDefinitions.coreEnabledPlugins.key,
      settingDefinitions.coreProxy.key,
      settingDefinitions.coreCacheEnabled.key,
      settingDefinitions.coreCacheMaxSize.key,
      settingDefinitions.coreCacheTtl.key,
      settingDefinitions.coreAsyncEnabled.key,
      settingDefinitions.coreAsyncResponseTimeout.key,
      settingDefinitions.coreAsyncMaxWorkers.key,
      settingDefinitions.coreAsyncMaxTasks.key,
      settingDefinitions.coreAsyncCacheTtlHours.key,
    ],
  },
];

const labels: Record<string, string> = Object.fromEntries(
  Object.values(settingDefinitions).map((definition) => [
    definition.key,
    definition.key
      .split(".")
      .slice(1)
      .join(" ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase()),
  ]),
);

const normalizeForInput = (value: SettingValue) => {
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "");
};

const parseInputValue = (key: string, raw: string, current: SettingValue): SettingValue => {
  if (Array.isArray(current)) {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof current === "boolean") {
    return raw === "true";
  }
  if (typeof current === "number") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : current;
  }
  if (key.includes("prompt")) {
    return raw;
  }
  return raw;
};

export function AdminSettingsPanel({ settings, adminBasePath }: AdminSettingsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const settingMap = useMemo(() => new Map(settings.map((setting) => [setting.key, setting])), [settings]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, normalizeForInput(setting.value)])),
  );
  const [activeGroup, setActiveGroup] = useState(groups[0].key);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = groups.find((group) => group.key === activeGroup) || groups[0];

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    setError(null);

    const payload: Record<string, SettingValue> = {};
    for (const field of active.fields) {
      const setting = settingMap.get(field);
      if (!setting) continue;
      payload[field] = parseInputValue(field, values[field] || "", setting.value);
    }

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: payload }),
      });
      const json = (await response.json().catch(() => ({}))) as { message?: string; adminPath?: string };
      if (!response.ok) {
        setError(json.message || "Failed to save settings.");
        return;
      }
      setFeedback("Settings saved.");
      startTransition(() => router.refresh());
      if (json.adminPath && json.adminPath !== adminBasePath) {
        window.location.href = `${json.adminPath}/settings`;
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-[8px] border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveGroup(group.key)}
            className={`block w-full rounded px-3 py-3 text-left text-sm font-semibold ${
              activeGroup === group.key
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
            }`}
          >
            {group.title}
          </button>
        ))}
      </aside>

      <section className="rounded-[8px] border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{active.title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Secret fields are masked on load. Leave them blank to keep the saved value unchanged.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || isPending}
            className="inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>

        {feedback ? <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">{feedback}</div> : null}
        {error ? <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">{error}</div> : null}

        <div className="mt-6 grid gap-4">
          {active.fields.map((field) => {
            const setting = settingMap.get(field);
            if (!setting) return null;
            const currentValue = values[field] ?? "";
            const isLong = field.includes("prompt");
            const isBoolean = typeof setting.value === "boolean";
            return (
              <label key={field} className="block">
                <span className="mb-2 block text-sm font-semibold">{labels[field] || field}</span>
                {isBoolean ? (
                  <select
                    value={currentValue}
                    onChange={(event) => setValues((next) => ({ ...next, [field]: event.target.value }))}
                    className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : isLong ? (
                  <textarea
                    value={currentValue}
                    onChange={(event) => setValues((next) => ({ ...next, [field]: event.target.value }))}
                    rows={5}
                    className="w-full rounded border border-neutral-200 bg-white px-4 py-3 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  />
                ) : (
                  <input
                    value={currentValue}
                    onChange={(event) => setValues((next) => ({ ...next, [field]: event.target.value }))}
                    type={setting.isSecret ? "password" : "text"}
                    className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  />
                )}
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
