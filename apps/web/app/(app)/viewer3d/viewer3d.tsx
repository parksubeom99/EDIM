"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * ⑩ 브라우저 3D 뷰어 (청사진 p4 DWG 3D · p37). BOM 스냅샷의 구획 박스(길이 × 폭 × 높이)를 그대로 쌓아 돌려 본다.
 * 새 데이터 없음 — /api/model3d 가 도면과 같은 입구(스냅샷)에서 준 값만 그린다. 부품은 배치 칸(앞·중·뒤 × 상·중·하)에 점으로.
 * 아직 없음: glTF 내보내기 · 실제 부품 형상.
 */
interface Box { name: string; x: number; len: number; dir?: string; components?: { code: string; at: string; level: string }[] }
interface Model { code: string; runId: string; dims: { W: number; H: number; L: number }; boxes: Box[]; length: number }

const MM = 0.001; // mm → m (카메라 계산을 사람 크기로)
const AT_F: Record<string, number> = { front: 0.2, center: 0.5, rear: 0.8 };
const LEVEL_F: Record<string, number> = { bottom: 0.2, mid: 0.5, top: 0.8 };
const PALETTE = [0x2f8f83, 0x4b7bb5, 0x9c6fb0, 0xc0843a, 0x5e9e4f, 0xb5534b, 0x6d7f8c, 0x3f9fb5, 0x8a8f3a];
const VIEWS: Record<string, [number, number, number]> = { iso: [1, 0.8, 1.2], front: [0, 0.2, 1.6], top: [0, 1.8, 0.001], right: [1.8, 0.2, 0] };

const btn = (on: boolean): CSSProperties => ({ fontSize: "var(--fs-12)", padding: "3px 10px", borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer",
  background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "var(--accent-contrast)" : "var(--ink)" });

export function Viewer3D({ runId }: { runId: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const setViewRef = useRef<((v: string) => void) | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "1" | "err">("loading");
  const [tri, setTri] = useState(0);
  const [view, setView] = useState("iso");

  useEffect(() => {
    let live = true;
    fetch(`/api/model3d?runId=${encodeURIComponent(runId)}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!live) return;
      if (!r.ok) { setErr(`${r.status} · ${j.error ?? "불러오기 실패"}`); setState("err"); return; }
      setModel(j as Model);
    }).catch(() => { if (live) { setErr("불러오기 실패"); setState("err"); } });
    return () => { live = false; };
  }, [runId]);

  useEffect(() => {
    const el = host.current;
    if (!model || !el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setErr("이 브라우저에서 WebGL 을 쓸 수 없습니다 — 도면(DXF)의 등각도를 쓰십시오"); setState("err"); return;
    }
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f6f8);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(4, 8, 6); scene.add(sun);

    const { W, H } = model.dims;
    const total = model.length * MM, wm = W * MM, hm = H * MM;
    const group = new THREE.Group();
    model.boxes.forEach((b, i) => {
      const len = b.len * MM;
      const geo = new THREE.BoxGeometry(Math.max(len - 0.01, 0.005), hm, wm);
      const mat = new THREE.MeshStandardMaterial({ color: PALETTE[i % PALETTE.length], transparent: true, opacity: 0.55, roughness: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      const cx = b.x * MM + len / 2 - total / 2;
      mesh.position.set(cx, hm / 2, 0);
      group.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1c2b2b }));
      edges.position.copy(mesh.position);
      group.add(edges);
      for (const c of b.components ?? []) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.min(len, hm) * 0.08, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd9480f }));
        dot.position.set(b.x * MM + len * (AT_F[c.at] ?? 0.5) - total / 2, hm * (LEVEL_F[c.level] ?? 0.5), 0);
        group.add(dot);
      }
    });
    scene.add(group);
    const grid = new THREE.GridHelper(Math.ceil(total * 1.6), Math.ceil(total * 1.6), 0xb8c2c8, 0xdde3e7);
    scene.add(grid);

    const R = Math.max(total, wm, hm) * 1.4;
    const place = (v: string) => {
      const d = VIEWS[v] ?? VIEWS.iso!;
      camera.position.set(d[0] * R, d[1] * R + hm / 2, d[2] * R);
      controls.target.set(0, hm / 2, 0);
      controls.update();
    };
    setViewRef.current = place;
    place("iso");

    let raf = 0, first = true;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      if (first) { first = false; setTri(renderer.info.render.triangles); setState("1"); }
      raf = requestAnimationFrame(loop);
    };
    loop();
    const onResize = () => { const ww = el.clientWidth, hh = el.clientHeight; renderer.setSize(ww, hh); camera.aspect = ww / hh; camera.updateProjectionMatrix(); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | undefined; mt?.dispose?.(); });
      renderer.dispose();
      renderer.domElement.remove();
      setViewRef.current = null;
    };
  }, [model]);

  return (
    <section data-testid="viewer3d" data-ready={state} data-boxes={model?.boxes.length ?? 0} data-triangles={tri} style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{model?.code ?? "—"}</span>
        <span style={{ fontSize: "var(--fs-12)", color: "var(--ink-muted)" }}>
          {model ? `W${model.dims.W} × H${model.dims.H} × 전장 ${model.length} mm · 구획 ${model.boxes.length} · 스냅샷 ${model.runId.slice(0, 8)}` : ""}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["iso", "등각"], ["front", "정면"], ["top", "평면"], ["right", "우측면"]].map(([k, l]) => (
            <button key={k} type="button" data-testid={`view3d-${k}`} onClick={() => { setView(k!); setViewRef.current?.(k!); }} style={btn(view === k)}>{l}</button>
          ))}
        </span>
      </div>
      <div ref={host} data-testid="viewer3d-canvas" style={{ width: "100%", height: 520, border: "1px solid var(--line)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#f4f6f8" }} />
      {err && <p data-testid="viewer3d-error" style={{ color: "var(--warn)", fontSize: "var(--fs-13)" }}>{err}</p>}
      {model && (
        <table data-testid="viewer3d-sections" style={{ borderCollapse: "collapse", marginTop: 8, fontSize: "var(--fs-12)" }}>
          <tbody>
            <tr>{model.boxes.map((b, i) => <td key={b.name} style={{ padding: "3px 10px", borderLeft: `6px solid #${PALETTE[i % PALETTE.length]!.toString(16).padStart(6, "0")}` }}>{b.name}</td>)}</tr>
            <tr>{model.boxes.map((b) => <td key={b.name} style={{ padding: "3px 10px", fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{b.len}{b.dir ? ` · ${b.dir}` : ""}</td>)}</tr>
          </tbody>
        </table>
      )}
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>
        드래그 = 회전 · 휠 = 확대 · 오른쪽 드래그 = 이동. 주황 점 = 부품 배치 칸. 아직 없음: glTF 내보내기 · 실제 부품 형상(지금은 구획 박스).
      </p>
    </section>
  );
}
