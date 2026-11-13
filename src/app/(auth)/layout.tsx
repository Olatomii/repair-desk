export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout shell">
      <aside className="auth-story">
        <p className="eyebrow">YOUR REPAIRS. ONE PLACE.</p>
        <h2>
          Good service
          <br />
          starts with
          <br />
          <span>clear details.</span>
        </h2>
        <p>
          Keep the conversation, the agreed quote and the handover connected to
          the same repair.
        </p>
        <ol>
          <li>
            <span>01</span>Request the repair
          </li>
          <li>
            <span>02</span>Approve the quote
          </li>
          <li>
            <span>03</span>Confirm the handover
          </li>
        </ol>
        <small>Repair Desk / Service, connected.</small>
      </aside>
      <div className="auth-content">{children}</div>
    </div>
  );
}
