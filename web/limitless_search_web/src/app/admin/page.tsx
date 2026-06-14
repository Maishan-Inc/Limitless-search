import type { Metadata } from "next";
import { renderAdminPath } from "@/lib/admin-pages";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Limitless Search admin login and first setup page.",
};

export default async function AdminPage() {
  return renderAdminPath("/admin", []);
}
