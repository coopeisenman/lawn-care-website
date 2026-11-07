import { BUSINESS } from "@/lib/business";

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <span>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</span>
        <span>
          {BUSINESS.serviceAreas.join(" · ")} ·{" "}
          <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>
        </span>
      </div>
    </footer>
  );
}
