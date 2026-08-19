import { AuthGate } from "@/components/auth/auth-gate";

export default function BantuanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate area="dashboard">{children}</AuthGate>;
}
