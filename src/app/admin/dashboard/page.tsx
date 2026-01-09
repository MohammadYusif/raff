import { requireAdmin } from "@/lib/auth/guards";
import { AdminDashboardContent } from "./AdminDashboardContent";

export default async function AdminDashboardPage() {
  await requireAdmin("page");

  return <AdminDashboardContent />;
}
