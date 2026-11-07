import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuoteForm from "@/components/QuoteForm";
import { BUSINESS } from "@/lib/business";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main id="top">
        <section className="hero">
          <div className="sun" aria-hidden="true"></div>
          <div className="wrap">
            <p className="eyebrow" style={{ color: "var(--amber)" }}>
              Serving {BUSINESS.serviceAreas.join(" · ")}
            </p>
            <h1>
              A yard you&apos;re <em>proud</em> to come home to.
            </h1>
            <p>
              Westward Property Care keeps your lawn sharp in the summer, your yard clear in the fall,
              and your driveway open in the winter — without the hassle.
            </p>
            <div className="hero-actions">
              <a href="#quote" className="btn btn-primary">Get a Free Estimate</a>
              <a href={`tel:${BUSINESS.phone}`} className="btn btn-ghost">
                Call {BUSINESS.phoneDisplay}
              </a>
            </div>
            <div className="hero-badges">
              <span>Free estimates</span>
              <span>Year-round service</span>
              <span>Reliable scheduling</span>
            </div>
          </div>
        </section>

        <section id="services">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">What we do</p>
              <h2>Services for every season</h2>
              <p>
                From summer mowing to winter snow removal, we handle the work so you can enjoy the
                results.
              </p>
            </div>
            <div className="grid">
              <div className="card">
                <div className="icon">
                  <svg viewBox="0 0 24 24"><path d="M3 20h18M5 20v-4M9 20v-6M13 20v-5M17 20v-7M21 20v-4" /></svg>
                </div>
                <h3>Lawn Service</h3>
                <p>
                  Weekly or bi-weekly mowing plus clean trimming around fences, trees, beds and
                  walkways for a sharp, finished look.
                </p>
              </div>
              <div className="card">
                <div className="icon">
                  <svg viewBox="0 0 24 24"><path d="M12 3c4 4 6 7 6 10a6 6 0 01-12 0c0-3 2-6 6-10zM12 21v-8" /></svg>
                </div>
                <h3>Leaf Cleanup</h3>
                <p>Fall leaf removal that clears your lawn and beds before winter sets in.</p>
              </div>
              <div className="card">
                <div className="icon">
                  <svg viewBox="0 0 24 24"><path d="M12 2v20M4.9 6l14.2 12M4.9 18L19.1 6M9 3l3 3 3-3M9 21l3-3 3 3" /></svg>
                </div>
                <h3>Snow Removal</h3>
                <p>Driveways, sidewalks and walkways cleared so you can get out the door safely.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="why">
          <div className="wrap why-grid">
            <div>
              <div className="section-head" style={{ marginBottom: 30 }}>
                <p className="eyebrow">Why Westward</p>
                <h2>Property care you don&apos;t have to think about</h2>
              </div>
              <ul className="why-list">
                <li>
                  <div className="num">1</div>
                  <div>
                    <h3>We show up</h3>
                    <p>Consistent scheduling you can count on, with a heads-up if weather shifts the plan.</p>
                  </div>
                </li>
                <li>
                  <div className="num">2</div>
                  <div>
                    <h3>Attention to detail</h3>
                    <p>Clean lines, clippings blown off hard surfaces, and gates closed behind us — every visit.</p>
                  </div>
                </li>
                <li>
                  <div className="num">3</div>
                  <div>
                    <h3>Free estimates</h3>
                    <p>Clear, no-obligation pricing up front with no surprises on your bill.</p>
                  </div>
                </li>
                <li>
                  <div className="num">4</div>
                  <div>
                    <h3>Easy to reach</h3>
                    <p>Call or text with a question and get a real answer from a real person.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="why-art" aria-hidden="true">
              <svg viewBox="0 0 400 340" preserveAspectRatio="xMidYMid slice">
                <rect width="400" height="340" fill="#f4c27a" />
                <circle cx="290" cy="150" r="60" fill="#e9a23b" />
                <path d="M0 200 Q100 150 200 190 T400 170 V340 H0Z" fill="#2f7a45" />
                <path d="M0 240 Q120 200 240 235 T400 220 V340 H0Z" fill="#1f4d2c" />
                <g fill="#3f8f55">
                  <rect x="0" y="280" width="400" height="16" opacity=".5" />
                  <rect x="0" y="312" width="400" height="16" opacity=".5" />
                </g>
                <g stroke="#14321d" strokeWidth="3" strokeLinecap="round">
                  <path d="M60 238v-14M66 238v-18M72 238v-12M330 228v-14M336 228v-18M342 228v-12" />
                </g>
                <g transform="translate(70 120)">
                  <rect x="0" y="40" width="70" height="50" fill="#faf7f0" />
                  <path d="M-8 44L35 8L78 44Z" fill="#14321d" />
                  <rect x="28" y="60" width="16" height="30" fill="#1f4d2c" />
                </g>
              </svg>
            </div>
          </div>
        </section>

        <section id="process">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">How it works</p>
              <h2>Getting started is easy</h2>
            </div>
            <div className="steps">
              <div className="step"><h3>Reach out</h3><p>Call, text, or fill out the form below — it only takes a minute.</p></div>
              <div className="step"><h3>Get a free estimate</h3><p>We&apos;ll check out your property and give you a clear, no-obligation price.</p></div>
              <div className="step"><h3>Pick your schedule</h3><p>Choose one-time service or a recurring plan that fits your needs.</p></div>
              <div className="step"><h3>Enjoy your yard</h3><p>We handle the work. You enjoy the curb appeal.</p></div>
            </div>
          </div>
        </section>

        <section id="quote" className="quote">
          <div className="wrap quote-grid">
            <div>
              <div className="section-head" style={{ marginBottom: 34 }}>
                <p className="eyebrow">Free estimates</p>
                <h2>Let&apos;s get your yard looking great</h2>
                <p>
                  Tell us a little about your property and we&apos;ll get back to you quickly with a
                  free estimate.
                </p>
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" /></svg>
                <div>
                  <strong>Call or text</strong>
                  <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>
                </div>
              </div>
              <div className="contact-item">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-6.5 8-13a8 8 0 10-16 0c0 6.5 8 13 8 13z" /><circle cx="12" cy="9" r="3" /></svg>
                <div>
                  <strong>Service area</strong>
                  <span>Millard, Papillion, Bellevue &amp; Plattsmouth, {BUSINESS.state}</span>
                </div>
              </div>
            </div>
            <QuoteForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
