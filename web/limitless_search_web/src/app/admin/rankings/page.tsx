import type { Metadata } from "next";
import { renderAdminPath } from "@/lib/admin-pages";

export const metadata: Metadata = {
  title: "AI Ranking Management",
  description: "Manage AI ranking versions, drafts, publishing, and creation flow.",
};

export default async function AdminRankingsPage() {
  return renderAdminPath("/admin", ["rankings"]);
}
