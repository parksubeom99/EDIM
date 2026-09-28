-- 0032 · p11 비밀번호 로그인 — app_user 에 비밀번호 해시 열 하나를 **추가만** 한다.
-- NULL = 비밀번호가 아직 없는 계정: EDIM_DEV_LOGIN=1(개발) 일 때만 이메일로 들어온다. 운영 기본값은 0 이라 거절.
-- 형식 scrypt$N$r$p$salt$hash (packages/auth/src/password.ts). platform 스키마는 건드리지 않는다
-- (플랫폼 관리자도 app_user 행이라 같은 열 · 같은 판정).
ALTER TABLE "app_user" ADD COLUMN "password_hash" TEXT NULL;
