import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InstallWizard } from "@/components/install/install-wizard";
import { detectPreferredLanguage } from "@/lib/i18n";
import { isInstalled } from "@/lib/install-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Install Limitless Search",
  description: "Install and initialize Limitless Search.",
};

export default async function InstallPage() {
  if (await isInstalled()) {
    notFound();
  }

  const requestHeaders = await headers();
  const initialLanguage = detectPreferredLanguage(requestHeaders.get("accept-language"));

  return <InstallWizard initialLanguage={initialLanguage} />;
}
