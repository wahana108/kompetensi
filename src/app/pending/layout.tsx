import { AuthGate } from "@/components/auth/auth-gate";

export default function PendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate area="pending">{children}</AuthGate>;
}
