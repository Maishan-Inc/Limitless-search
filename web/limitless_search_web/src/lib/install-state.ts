import "server-only";

import { getAdminUserCount } from "@/lib/admin-auth";

export const isInstalled = async () => (await getAdminUserCount()) > 0;
