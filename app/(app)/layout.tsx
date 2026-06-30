import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = sessaoAtual();
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
