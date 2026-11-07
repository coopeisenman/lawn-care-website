import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";

export default function AppHeader({ area, home }: { area: string; home: string }) {
  return (
    <header>
      <div className="wrap nav">
        <Link href={home} className="logo">
          <Logo />
          <span>
            Westward <span className="app-area">{area}</span>
          </span>
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
