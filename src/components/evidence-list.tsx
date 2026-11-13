type EvidenceItem = {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy: {
    name: string;
    role: string;
  };
};

export default function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) return null;

  return (
    <details className="mt-5">
      <summary className="cursor-pointer text-sm font-black text-[#2849c7]">
        Evidence ({evidence.length})
      </summary>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {evidence.map((item) => (
          <a
            key={item.id}
            className="rounded-xl border border-[#dce0e6] bg-white p-3 text-sm hover:bg-[#f5f5f1]"
            href={`/api/evidence/${item.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <div className="font-black">{item.kind.replaceAll("_", " ")} · {item.filename}</div>
            <div className="mt-1 text-xs text-[#626975]">
              {item.uploadedBy.name} ({item.uploadedBy.role.toLowerCase()}) · {Math.ceil(item.size / 1024)} KB
            </div>
          </a>
        ))}
      </div>
    </details>
  );
}
