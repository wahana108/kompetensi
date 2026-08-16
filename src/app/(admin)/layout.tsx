import { AuthGate } from "@/components/auth/auth-gate";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate area="admin">{children}</AuthGate>;
}
