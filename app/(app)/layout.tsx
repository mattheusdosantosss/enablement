import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = sessaoAtual();
  } catch {
    user = null;
  }
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar email={user.email} />
      <main className="app-main">
        <div className="reveal">{children}</div>
      </main>
    </div>
  );
}
