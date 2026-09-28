import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Single source of truth for env: the monorepo-root .env (same file the db/auth
// pnpm scripts read via dotenv-cli). Loaded here so `next dev|build|start` sees
// DATABASE_URL / APP_DATABASE_URL / AUTH_SECRET without duplicating the file.
config({ path: new URL("../../.env", import.meta.url) });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 배포 킷(apps/web/Dockerfile)만 standalone 으로 굽는다 — 모노레포 루트까지 추적해 워크스페이스 패키지를 담는다.
  // 로컬(Windows) 빌드는 그대로 둔다(pnpm 심링크 복사가 Windows 에서 권한 오류를 낸다).
  ...(process.env.EDIM_STANDALONE === "1"
    ? { output: "standalone", outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)) }
    : {}),
  // Workspace packages are shipped as TypeScript source (internal-packages
  // pattern); Next transpiles them instead of expecting a prebuilt dist.
  transpilePackages: [
    "@edim/core-ontology",
    "@edim/db",
    "@edim/auth",
    "@edim/ui",
  ],
};

export default nextConfig;
