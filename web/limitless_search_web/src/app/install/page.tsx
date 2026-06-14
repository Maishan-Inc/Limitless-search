import type { Metadata } from "next";
import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { InstallWizard } from "@/components/install/install-wizard";
import { getInstallState } from "@/lib/app-settings";

export const metadata: Metadata = {
  title: "Install Limitless Search",
  description: "Initial installation wizard for Limitless Search.",
};

export const dynamic = "force-dynamic";

const readLicense = async () => {
  try {
    return await fs.readFile(path.join(process.cwd(), "..", "..", "LICENSE"), "utf8");
  } catch {
    try {
      return await fs.readFile(path.join(process.cwd(), "LICENSE"), "utf8");
    } catch {
      return "License file not found. Review the project repository license before continuing.";
    }
  }
};

export default async function InstallPage() {
  const installState = await getInstallState();
  if (installState.installed) {
    redirect(installState.adminPath);
  }

  const license = await readLicense();
  return <InstallWizard licenseText={license} />;
}
