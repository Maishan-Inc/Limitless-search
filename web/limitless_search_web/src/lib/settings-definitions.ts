import { DEFAULT_ENABLED_PLUGINS, DEFAULT_SEARCH_CHANNELS } from "@/lib/default-search-sources";

export type SettingValue = string | number | boolean | string[] | Record<string, unknown> | null;

export type AppSettingDefinition<T extends SettingValue = SettingValue> = {
  key: string;
  category: string;
  defaultValue: T;
  secret?: boolean;
};

export const DEFAULT_ADMIN_PATH = "/admin";

export const settingDefinitions = {
  adminPath: { key: "admin.path", category: "core", defaultValue: DEFAULT_ADMIN_PATH },
  aiSuggestEnabled: { key: "ai.suggest.enabled", category: "ai", defaultValue: true },
  aiSuggestBaseUrl: { key: "ai.suggest.base_url", category: "ai", defaultValue: "" },
  aiSuggestModel: { key: "ai.suggest.model", category: "ai", defaultValue: "" },
  aiSuggestApiKey: { key: "ai.suggest.api_key", category: "ai", defaultValue: "", secret: true },
  aiSuggestPrompt: { key: "ai.suggest.prompt", category: "prompts", defaultValue: "" },
  aiSuggestThreshold: { key: "ai.suggest.threshold", category: "ai", defaultValue: 50 },
  aiSuggestRequireCaptcha: { key: "ai.suggest.require_captcha", category: "ai", defaultValue: false },
  captchaProvider: { key: "captcha.provider", category: "captcha", defaultValue: "none" },
  turnstileSiteKey: { key: "captcha.turnstile.site_key", category: "captcha", defaultValue: "" },
  turnstileSecretKey: { key: "captcha.turnstile.secret_key", category: "captcha", defaultValue: "", secret: true },
  hcaptchaSiteKey: { key: "captcha.hcaptcha.site_key", category: "captcha", defaultValue: "" },
  hcaptchaSecretKey: { key: "captcha.hcaptcha.secret_key", category: "captcha", defaultValue: "", secret: true },
  rankingsEnabled: { key: "rankings.enabled", category: "rankings", defaultValue: false },
  rankingsNavEnabled: { key: "rankings.nav_enabled", category: "rankings", defaultValue: false },
  rankingsBaseUrl: { key: "rankings.ai.base_url", category: "rankings", defaultValue: "" },
  rankingsModel: { key: "rankings.ai.model", category: "rankings", defaultValue: "" },
  rankingsApiKey: { key: "rankings.ai.api_key", category: "rankings", defaultValue: "", secret: true },
  rankingsRunAt: { key: "rankings.run_at", category: "rankings", defaultValue: "03:00" },
  rankingsTimezone: { key: "rankings.timezone", category: "rankings", defaultValue: "Asia/Shanghai" },
  rankingsRunOnStartup: { key: "rankings.run_on_startup", category: "rankings", defaultValue: false },
  rankingsMinItems: { key: "rankings.min_items", category: "rankings", defaultValue: 20 },
  rankingsSyncToken: { key: "rankings.sync_token", category: "rankings", defaultValue: "change-this-token", secret: true },
  rankingsDataDir: { key: "rankings.data_dir", category: "rankings", defaultValue: "/app/data/rankings" },
  promptYearly: { key: "prompts.rankings.yearly", category: "prompts", defaultValue: "" },
  promptMonthly: { key: "prompts.rankings.monthly", category: "prompts", defaultValue: "" },
  promptDaily: { key: "prompts.rankings.daily", category: "prompts", defaultValue: "" },
  promptModeration: { key: "prompts.rankings.moderation", category: "prompts", defaultValue: "" },
  promptTranslate: { key: "prompts.rankings.translate", category: "prompts", defaultValue: "" },
  promptScore: { key: "prompts.rankings.score", category: "prompts", defaultValue: "" },
  promptVerify: { key: "prompts.rankings.verify", category: "prompts", defaultValue: "" },
  coreChannels: { key: "core.channels", category: "core", defaultValue: [...DEFAULT_SEARCH_CHANNELS] },
  coreEnabledPlugins: { key: "core.enabled_plugins", category: "core", defaultValue: [...DEFAULT_ENABLED_PLUGINS] },
  coreProxy: { key: "core.proxy", category: "core", defaultValue: "" },
  coreCacheEnabled: { key: "core.cache.enabled", category: "core", defaultValue: true },
  coreCacheMaxSize: { key: "core.cache.max_size", category: "core", defaultValue: 100 },
  coreCacheTtl: { key: "core.cache.ttl", category: "core", defaultValue: 60 },
  coreAsyncEnabled: { key: "core.async.enabled", category: "core", defaultValue: true },
  coreAsyncResponseTimeout: { key: "core.async.response_timeout", category: "core", defaultValue: 4 },
  coreAsyncMaxWorkers: { key: "core.async.max_workers", category: "core", defaultValue: 20 },
  coreAsyncMaxTasks: { key: "core.async.max_tasks", category: "core", defaultValue: 100 },
  coreAsyncCacheTtlHours: { key: "core.async.cache_ttl_hours", category: "core", defaultValue: 1 },
} satisfies Record<string, AppSettingDefinition>;
