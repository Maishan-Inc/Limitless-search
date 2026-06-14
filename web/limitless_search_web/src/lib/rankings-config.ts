import { getSettingValue, settingDefinitions } from "@/lib/app-settings";

export const rankingsEnabled = async () =>
  Boolean(await getSettingValue(settingDefinitions.rankingsEnabled));

export const rankingsNavEnabled = async () =>
  Boolean(await getSettingValue(settingDefinitions.rankingsNavEnabled));
