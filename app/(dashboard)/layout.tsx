import NavTabs from "@/components/NavTabs";

function Logo() {
  return (
    <div className="logo">
      <span style={{ height: "40%" }} />
      <span style={{ height: "65%" }} />
      <span style={{ height: "100%" }} />
      <span style={{ height: "75%" }} />
      <span style={{ height: "50%" }} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <header className="header">
        <div className="brand">
          <Logo />
          <div>
            <h1>PSA · <b>Comercial</b></h1>
            <div className="sub">Performance dos times comerciais · mês atual</div>
          </div>
        </div>
        <div className="live">
          <span className="dot" />
          ao vivo
        </div>
      </header>
      <hr className="hr" />
      <NavTabs />
      <div className="reveal">{children}</div>
      <footer className="footer">PSA · Painel Comercial</footer>
    </div>
  );
}
