import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { hasSession, isDemoMode } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSession()) redirect("/sign-in");
  const demo = isDemoMode();

  return (
    <div className="flex h-screen w-full" style={{ background: "var(--at-bg)" }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {demo && (
          <div
            className="flex flex-none items-center justify-center gap-2 px-4 py-[7px] text-center text-[.74rem] font-semibold"
            style={{ background: "var(--at-gold-gradient)", color: "var(--at-on-gold)" }}
          >
            DEMO · sample data only — not a live compliance environment. Do not enter real customer information.
          </div>
        )}
        <Topbar />
        <main className="flex-1 overflow-y-auto px-9 pb-16 pt-[30px]">{children}</main>
      </div>
    </div>
  );
}
