import { AuthGate } from "@/components/auth/auth-gate";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate area="guest">{children}</AuthGate>;
}
