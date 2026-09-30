# EDIM web — 다단계 이미지 (ccmd I STEP 6 · docs/DEPLOY.md)
#   deps    : pnpm install (워크스페이스 전체 · lockfile 고정)
#   builder : prisma generate → next build (output: standalone)
#   runner  : standalone 서버만 — 소스·devDependencies 없음. .env 는 굽지 않는다(.dockerignore).
# 빌드 문맥은 저장소 루트: docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl && corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/bom-code/package.json packages/bom-code/
COPY packages/core-ontology/package.json packages/core-ontology/
COPY packages/db/package.json packages/db/
COPY packages/hierarchy-address/package.json packages/hierarchy-address/
COPY packages/macro-compile/package.json packages/macro-compile/
COPY packages/macro-dsl/package.json packages/macro-dsl/
COPY packages/macro-registry/package.json packages/macro-registry/
COPY packages/macro-verify/package.json packages/macro-verify/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# builder 는 migrate 1회성 작업(마이그레이션 · 샘플 시드)에도 쓴다 — prisma CLI · tsx 가 들어 있다.
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 EDIM_STANDALONE=1
RUN pnpm --filter @edim/db exec prisma generate && pnpm --filter @edim/web build
# standalone 추적은 Prisma 엔진(.so.node)·schema 를 빠뜨린다 — 따로 모아 runner 가 찾는 자리(apps/web/.prisma/client)에 둔다.
RUN mkdir -p /prisma-engine && cp "$(find node_modules/.pnpm -type d -path '*node_modules/.prisma/client' | head -1)"/*.node       "$(find node_modules/.pnpm -type d -path '*node_modules/.prisma/client' | head -1)"/schema.prisma /prisma-engine/

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S edim && adduser -S edim -G edim
COPY --from=builder --chown=edim:edim /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=edim:edim /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=edim:edim /prisma-engine/ ./apps/web/.prisma/client/
# 실행 중에 읽는 규칙 파일(샘플 + 회사 .local.json 이 있으면 그것까지) — standalone 추적은 동적 경로 파일을 못 담는다.
#   CAD 규칙서(ccmd K · p36 · p38) · PCR 요율표(ccmd M · p66). 서버가 /app 에서 위로 packages/bom-code/… 를 찾는다.
COPY --from=builder --chown=edim:edim /repo/packages/bom-code/cad-rules ./packages/bom-code/cad-rules
COPY --from=builder --chown=edim:edim /repo/packages/bom-code/cost-rules ./packages/bom-code/cost-rules
USER edim
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
