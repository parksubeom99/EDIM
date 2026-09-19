import Link from "next/link";
import { getServerSession } from "@/app/lib/session";
import { canAccessModule } from "@/app/lib/modules";
import { SetupShell } from "./setup-shell";

/**
 * [Set-up / PLM] BOM Code Set-Up — EDIM.pdf p30–34.
 * S-1-1 Sub Code (p31) · S-1-3 Product Code + Table (p33) · S-1-4 Product Code
 * Relationship + Part List Running Test (p34). Guarded like the PLM module.
 */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession();
  const allowed = !!session && canAccessModule(session.role, "plm");
  const { tab } = await searchParams;
  if (!allowed)
    return (
      <main style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}>
        <Link href="/workbench" style={{ color: "var(--accent)", fontSize: "var(--fs-13)" }}>← MainForm</Link>
        <p style={{ color: "var(--ink-muted)" }}>이 역할은 PLM Set-Up에 접근할 수 없습니다.</p>
      </main>
    );
  return <SetupShell initialTab={tab === "product" || tab === "relationship" ? tab : "sub"} />;
}
