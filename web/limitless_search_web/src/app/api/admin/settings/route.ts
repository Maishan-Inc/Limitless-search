import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getAdminPath, settingDefinitions, updateSettingValues, validateAdminPath, type SettingValue } from "@/lib/app-settings";

export async function PATCH(request: NextRequest) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    values?: Record<string, SettingValue>;
  };

  const values = payload.values || {};
  if (typeof values !== "object" || Array.isArray(values)) {
    return NextResponse.json({ message: "Invalid settings payload" }, { status: 400 });
  }

  const adminPathKey = settingDefinitions.adminPath.key;
  if (adminPathKey in values) {
    const result = validateAdminPath(String(values[adminPathKey] || ""));
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }
    values[adminPathKey] = result.path;
  }

  await updateSettingValues(values, {
    adminId: admin.id,
    preserveBlankSecrets: true,
  });

  const adminPath = await getAdminPath();
  return NextResponse.json({ ok: true, adminPath });
}
