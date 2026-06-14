import { NextResponse } from "next/server";
import { getEnvironmentChecks, getInstallState } from "@/lib/app-settings";

export async function GET() {
  const [installState, checks] = await Promise.all([
    getInstallState(),
    getEnvironmentChecks(),
  ]);

  return NextResponse.json({
    installState,
    checks,
    ok: checks.every((check) => check.ok),
  });
}
