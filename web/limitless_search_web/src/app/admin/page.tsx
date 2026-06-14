import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAuthPanel } from "@/components/admin/admin-auth-panel";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getAdminBootstrapData } from "@/lib/admin-service";
import { isInstalled } from "@/lib/install-state";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Limitless Search admin login and first setup page.",
};

export default async function AdminPage() {
  if (!(await isInstalled())) {
    redirect("/install");
  }

  const currentUser = await getCurrentAdminUser();
  if (currentUser) {
    redirect("/admin/dashboard");
  }

  const bootstrap = await getAdminBootstrapData();

  return <AdminAuthPanel bootstrap={bootstrap} />;
}
