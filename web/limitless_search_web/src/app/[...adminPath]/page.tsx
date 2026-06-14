import { renderAdminPath } from "@/lib/admin-pages";

type DynamicAdminPageProps = {
  params: Promise<{
    adminPath?: string[];
  }>;
};

export default async function DynamicAdminPage({ params }: DynamicAdminPageProps) {
  const resolved = await params;
  const segments = resolved.adminPath || [];
  const base = segments[0] ? `/${segments[0]}` : "/admin";
  return renderAdminPath(base, segments.slice(1));
}
