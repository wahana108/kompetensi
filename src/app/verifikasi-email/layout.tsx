import { AuthGate } from "@/components/auth/auth-gate";

export default function VerifikasiEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate area="verify-email">{children}</AuthGate>;
}
