import Link from "next/link";
export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Repair Desk home">
      <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 3h15v8H11v7H3zm19 19h15v15H22v-8h7v-7z"
        />
        <path fill="#4263eb" d="M22 3h15v15h-8v-7h-7zM3 22h8v7h7v8H3z" />
      </svg>
      <span>
        repair<span className="brand-light">desk</span>
        <span className="brand-caption">SERVICE, CONNECTED.</span>
      </span>
    </Link>
  );
}
