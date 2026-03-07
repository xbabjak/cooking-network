import { Nav } from "@/components/nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
