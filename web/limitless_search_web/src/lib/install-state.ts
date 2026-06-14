import "server-only";

import { getInstallState } from "@/lib/app-settings";

export const isInstalled = async () => {
  const state = await getInstallState();
  return state.installed;
};
