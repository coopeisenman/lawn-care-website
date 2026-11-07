import Link from "next/link";
import Logo from "./Logo";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <div className="wrap nav">
          <Link href="/" className="logo">
            <Logo />
            Westward Property Care
          </Link>
        </div>
      </header>
      <main className="app-main">
        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
