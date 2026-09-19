import Link from "next/link";

const services = [
  {
    mode: "At your home",
    name: "Plumbing",
    description: "Leaks, blocked drains, taps, pipes, and everyday plumbing repairs.",
    action: "Book a home inspection",
  },
  {
    mode: "At the workshop",
    name: "Phone repair",
    description: "Diagnosis, an agreed quote, repair progress, and a recorded handover.",
    action: "Book a workshop visit",
  },
];

export default function Home() {
  return (
    <main>
      <section className="shell grid gap-10 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
        <div className="self-center">
          <p className="eyebrow">Repairs, organised</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] md:text-7xl">
            Know who. Agree what. Confirm done.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#64706a]">
            Book a repair, receive an artisan assignment, approve the quote before work starts,
            and keep a clear record from request to handover.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="button-primary">
              Start a repair request
            </Link>
            <a href="#how-it-works" className="button-secondary">
              See how it works
            </a>
          </div>
        </div>

        <div className="card overflow-hidden p-4">
          <div className="rounded-[1rem] bg-[#123b2c] p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-white/60">
              Local service, clearer process
            </p>
            <div className="mt-14 space-y-5">
              {["Request", "Quote", "Repair", "Handover"].map((item, index) => (
                <div key={item} className="flex items-center gap-4 border-t border-white/15 pt-4">
                  <span className="text-sm text-white/45">0{index + 1}</span>
                  <span className="text-xl font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-10">
        <p className="eyebrow">Launching first in Abeokuta · More cities can be added</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Choose a service</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {services.map((service) => (
            <article key={service.name} className="card p-7">
              <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#64706a]">
                {service.mode}
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight">{service.name}</h2>
              <p className="mt-3 max-w-lg leading-7 text-[#64706a]">{service.description}</p>
              <Link href="/register" className="mt-7 inline-flex font-bold text-[#1f5b45]">
                {service.action} ↗
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="shell py-20">
        <div className="card p-8 md:p-12">
          <p className="eyebrow">A clear agreement, every step</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              ["01", "Meet the assigned artisan", "See who is responsible for the job before work begins."],
              ["02", "Approve the price", "Review and approve the quote before the repair moves into progress."],
              ["03", "Keep the record", "Track status changes and retain a clear completion and handover history."],
            ].map(([number, title, body]) => (
              <div key={number}>
                <div className="text-sm font-black text-[#d36a30]">{number}</div>
                <h3 className="mt-3 text-xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-[#64706a]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
