import "server-only";

import { notFound, redirect } from "next/navigation";
import { AdminAuthPanel } from "@/components/admin/admin-auth-panel";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminRankingsManager } from "@/components/admin/admin-rankings-manager";
import { AdminSettingsPanel } from "@/components/admin/admin-settings-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminBootstrapData, getAdminDashboardData, getAdminRankingWorkspace } from "@/lib/admin-service";
import { getCurrentAdminUser, requireAdminUser } from "@/lib/admin-auth";
import { getAdminPath, getAllSettings, getInstallState, normalizeAdminPath } from "@/lib/app-settings";

export type AdminSection = "login" | "dashboard" | "rankings" | "settings";

const resolveSection = (segments: string[]): AdminSection | null => {
  if (segments.length === 0) return "login";
  if (segments.length === 1 && segments[0] === "dashboard") return "dashboard";
  if (segments.length === 1 && segments[0] === "rankings") return "rankings";
  if (segments.length === 1 && segments[0] === "settings") return "settings";
  return null;
};

export const renderAdminPath = async (basePath: string, segments: string[]) => {
  const installState = await getInstallState();
  if (!installState.installed) {
    redirect("/install");
  }

  const configuredPath = await getAdminPath();
  if (normalizeAdminPath(basePath) !== configuredPath) {
    notFound();
  }

  const section = resolveSection(segments);
  if (!section) {
    notFound();
  }

  if (section === "login") {
    const currentUser = await getCurrentAdminUser();
    if (currentUser) {
      redirect(`${configuredPath}/dashboard`);
    }

    const bootstrap = await getAdminBootstrapData();
    return <AdminAuthPanel bootstrap={bootstrap} adminBasePath={configuredPath} />;
  }

  const currentUser = await requireAdminUser(configuredPath);

  if (section === "dashboard") {
    const preview = await getAdminDashboardData();
    return (
      <AdminShell
        title="Admin Overview"
        description="Review ranking versions, activity, and the publish workflow from one place."
        currentUserEmail={currentUser.email}
        adminBasePath={configuredPath}
      >
        <AdminDashboard preview={preview} />
      </AdminShell>
    );
  }

  if (section === "rankings") {
    const workspace = await getAdminRankingWorkspace();
    return (
      <AdminShell
        title="AI Rankings"
        description="Edit drafts, inspect AI runs, and prepare publish actions backed by PostgreSQL."
        currentUserEmail={currentUser.email}
        adminBasePath={configuredPath}
      >
        <AdminRankingsManager workspace={workspace} />
      </AdminShell>
    );
  }

  const settings = await getAllSettings({ maskSecrets: true });
  return (
    <AdminShell
      title="Settings"
      description="Configure AI, captcha, ranking automation, prompts, and runtime behavior."
      currentUserEmail={currentUser.email}
      adminBasePath={configuredPath}
    >
      <AdminSettingsPanel settings={settings} adminBasePath={configuredPath} />
    </AdminShell>
  );
};
