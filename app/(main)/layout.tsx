import { Nav } from "@/components/nav";
import { VerifyEmailBanner } from "@/components/verify-email-banner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <VerifyEmailBanner />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
