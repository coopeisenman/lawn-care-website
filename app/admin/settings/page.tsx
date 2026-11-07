import { requireAdmin } from "@/lib/session";
import { getTheme } from "@/lib/settings";
import { THEMES, THEME_INFO, lookFor } from "@/lib/theme";
import { todayLocal } from "@/lib/format";
import { saveTheme } from "@/lib/admin/actions";
import ActionForm, { SubmitButton } from "@/components/admin/ActionForm";

export const metadata = { title: "Settings | Westward Admin" };

export default async function SettingsPage() {
  await requireAdmin();
  const theme = await getTheme();
  const showing = lookFor(theme, todayLocal());

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="lede">Behind-the-scenes options for your website.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Website look</h2>
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-current btn-small">
            View website
          </a>
        </div>
        <p className="form-note" style={{ marginBottom: 16 }}>
          Changes the colors and decorations on your public homepage. Showing right now:{" "}
          <strong>{THEME_INFO[showing].label}</strong>
          {theme === "auto" && " (picked automatically for today's date)"}.
        </p>

        <ActionForm action={saveTheme}>
          <div className="theme-options full" role="radiogroup" aria-label="Website look">
            {THEMES.map((t) => (
              <label key={t} className="theme-option">
                <input type="radio" name="theme" value={t} defaultChecked={t === theme} />
                <span className="theme-card">
                  <span className="theme-swatch" aria-hidden="true">
                    {THEME_INFO[t].swatch.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </span>
                  <strong>
                    {THEME_INFO[t].label}
                    {t === "auto" && <span className="badge badge-amber theme-rec">Recommended</span>}
                  </strong>
                  <span className="theme-blurb">{THEME_INFO[t].blurb}</span>
                </span>
                {t !== "auto" && (
                  <a href={`/?preview=${t}`} target="_blank" rel="noreferrer" className="theme-preview">
                    Preview
                  </a>
                )}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <SubmitButton>Save look</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
