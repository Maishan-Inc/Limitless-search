import type { Metadata } from "next";
import { renderAdminPath } from "@/lib/admin-pages";

export const metadata: Metadata = {
  title: "Admin Overview",
  description: "Limitless Search admin overview page.",
};

export default async function AdminDashboardPage() {
  return renderAdminPath("/admin", ["dashboard"]);
}
