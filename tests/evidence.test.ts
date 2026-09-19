import { describe, expect, it } from "vitest";
import {
  roleCanUploadEvidence,
  statusAllowsEvidence,
  validateEvidenceMetadata,
} from "../src/lib/evidence";

describe("evidence validation", () => {
  it("accepts a small supported image", () => {
    expect(validateEvidenceMetadata({ kind: "BEFORE", mimeType: "image/png", size: 1024 })).toBeNull();
  });

  it("rejects unsupported file types", () => {
    expect(validateEvidenceMetadata({ kind: "DOCUMENT", mimeType: "application/x-msdownload", size: 1024 })).toMatch(/JPG/i);
  });

  it("enforces role-specific evidence kinds", () => {
    expect(roleCanUploadEvidence("CLIENT", "BEFORE")).toBe(true);
    expect(roleCanUploadEvidence("CLIENT", "AFTER")).toBe(false);
    expect(roleCanUploadEvidence("ARTISAN", "AFTER")).toBe(true);
  });

  it("enforces lifecycle-specific evidence rules", () => {
    expect(statusAllowsEvidence("CLIENT", "BEFORE", "REQUESTED")).toBe(true);
    expect(statusAllowsEvidence("CLIENT", "BEFORE", "IN_PROGRESS")).toBe(false);
    expect(statusAllowsEvidence("ARTISAN", "AFTER", "IN_PROGRESS")).toBe(true);
    expect(statusAllowsEvidence("ARTISAN", "AFTER", "ASSIGNED")).toBe(false);
  });
});
