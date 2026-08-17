import NavBar from "@/components/NavBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto p-4 sm:p-5 pb-24 sm:pb-8">{children}</main>
    </div>
  );
}
