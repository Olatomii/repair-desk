import Link from "next/link";
export default function Home() {
  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="availability-dot" /> A better way to get it fixed
          </p>
          <h1>
            Life happens.
            <br />
            Let’s get it
            <br />
            <span>working again.</span>
          </h1>
          <p className="hero-description">
            The right person. A price you approve. A repair you can follow. Keep
            every detail together, from the first request to the final handover.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="button-primary">
              Start a repair request <span aria-hidden="true">↗</span>
            </Link>
            <a href="#how-it-works" className="text-link">
              How it works <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-assurance">
            <span>Quote before commitment</span>
            <span>A record at every step</span>
          </div>
        </div>
        <div
          className="repair-scene"
          aria-label="Illustration of the repair process"
        >
          <div className="scene-heading">
            <span>THE REPAIR DESK</span>
            <span>01 / REQUEST TO RESOLUTION</span>
          </div>
          <div className="device-stage" aria-hidden="true">
            <div className="device-shadow" />
            <div className="device">
              <div className="device-camera" />
              <div className="device-screen">
                <span className="device-plus">+</span>
                <span>
                  BACK TO
                  <br />
                  EVERYDAY.
                </span>
                <small>REPAIR. RESTORE. RECONNECT.</small>
              </div>
            </div>
            <div className="orbit-label">
              A little care.
              <br />A longer life.
            </div>
            <span className="scene-cross">+</span>
          </div>
          <div className="process-ticket">
            <div>
              <span className="eyebrow">HOW YOUR REPAIR MOVES</span>
              <strong>Clear at every stage.</strong>
            </div>
            <ol>
              <li>
                <span>01</span>Request
              </li>
              <li>
                <span>02</span>Approve quote
              </li>
              <li>
                <span>03</span>Repair & handover
              </li>
            </ol>
          </div>
          <span className="scene-caption">
            A process illustration. Your repair has its own record.
          </span>
        </div>
      </section>
      <section className="service-section shell" id="services">
        <div className="section-heading">
          <div>
            <p className="eyebrow">What needs attention?</p>
            <h2>
              Small problems.
              <br />
              Sorted properly.
            </h2>
          </div>
          <p>
            Home or workshop, the process stays clear.
            <br />
            Initial service area: Abeokuta.
          </p>
        </div>
        <div className="services-grid">
          <Link href="/register" className="service-tile">
            <span className="service-number">01 / AT YOUR HOME</span>
            <div className="service-visual plumbing-visual" aria-hidden="true">
              <span />
              <i />
            </div>
            <div className="service-title">
              <h3>Plumbing</h3>
              <span aria-hidden="true">↗</span>
            </div>
            <p>
              From a persistent drip to a blocked drain. Request an inspection
              and agree the work before it starts.
            </p>
            <span className="service-action">Book a home inspection</span>
          </Link>
          <Link href="/register" className="service-tile">
            <span className="service-number">02 / AT THE WORKSHOP</span>
            <div className="service-visual phone-visual" aria-hidden="true">
              <span />
              <i />
            </div>
            <div className="service-title">
              <h3>Phone repair</h3>
              <span aria-hidden="true">↗</span>
            </div>
            <p>
              Get a diagnosis, review the quote and follow the repair. Confirm
              handover when your device is back with you.
            </p>
            <span className="service-action">Book a workshop visit</span>
          </Link>
        </div>
      </section>
      <section className="process-section" id="how-it-works">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Less chasing. More clarity.</p>
              <h2>
                Know who. Agree what.
                <br />
                Confirm done.
              </h2>
            </div>
            <p>
              One repair record keeps you, your artisan
              <br />
              and the service team on the same page.
            </p>
          </div>
          <div className="process-grid">
            {[
              [
                "01",
                "Tell us what’s wrong",
                "Choose your service and city. Describe the problem so the service team can assign an appropriate artisan.",
              ],
              [
                "02",
                "Agree before work begins",
                "Review the proposed price and scope. Approve it, or request a revised quote before work starts.",
              ],
              [
                "03",
                "Follow it through",
                "Track progress, review repair evidence and confirm the final handover. The history stays with your request.",
              ],
            ].map(([n, t, p]) => (
              <article key={n}>
                <span className="process-number">{n}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="closing-section shell">
        <p className="eyebrow">Your next repair, organised.</p>
        <h2>
          Let’s put things
          <br />
          back in working order.
        </h2>
        <Link href="/register" className="button-primary">
          Create your account <span aria-hidden="true">↗</span>
        </Link>
        <p>
          Are you an artisan?{" "}
          <Link href="/apply">Apply to work with Repair Desk</Link>.
        </p>
      </section>
    </main>
  );
}
