import { NextResponse } from "next/server";
import { withTenant, listWorkOrders } from "@edim/db";
import { sessionOr401 } from "../_util";

/** ccmd L · LA3 — 작업지시 목록(이 회사만 · RLS) */
export async function GET() {
  const a = await sessionOr401(); if ("res" in a) return a.res;
  return NextResponse.json({ rows: await withTenant(a.s.tenantId, (tx) => listWorkOrders(tx)) });
}
