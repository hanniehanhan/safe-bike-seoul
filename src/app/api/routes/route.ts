import { connection } from "next/server";

type Point = { lat: number; lng: number };
type KakaoResponse = { status?: string; route?: { properties?: { totalDistance?: number; totalTime?: number }; legs?: { steps?: { path?: { points?: unknown[] } }[] }[] } };
function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const { lat, lng } = value as Point;
  return typeof lat === "number" && Number.isFinite(lat) && lat >= 33 && lat <= 39 && typeof lng === "number" && Number.isFinite(lng) && lng >= 124 && lng <= 132;
}
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  await connection();
  let input: { start?: unknown; end?: unknown };
  try { input = await request.json(); } catch { return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers }); }
  if (!input || !isPoint(input.start) || !isPoint(input.end)) return Response.json({ error: "출발지와 목적지 좌표를 확인해 주세요." }, { status: 400, headers });
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return Response.json({ error: "카카오 경로 API 키가 설정되지 않았습니다." }, { status: 503, headers });
  const { start, end } = input;
  async function getRoute(mode: "BIKE_ONLY" | "SHORTEST") {
    const url = new URL("https://dapi.kakao.com/v2/routing/bicycle");
    for (const [k, v] of Object.entries({ start_x: start.lng, start_y: start.lat, end_x: end.lng, end_y: end.lat, route_mode: mode })) url.searchParams.set(k, String(v));
    const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("upstream");
    const data: KakaoResponse = await response.json();
    const props = data.route?.properties;
    if (data.status !== "OK" || !props || typeof props.totalDistance !== "number" || !Number.isFinite(props.totalDistance) || typeof props.totalTime !== "number" || !Number.isFinite(props.totalTime) || !Array.isArray(data.route?.legs)) throw new Error("no_route");
    const points: [number, number][] = [];
    for (const leg of data.route.legs) for (const step of leg.steps ?? []) for (const point of step.path?.points ?? []) {
      if (!Array.isArray(point) || point.length < 2 || typeof point[0] !== "number" || typeof point[1] !== "number" || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) throw new Error("invalid_route");
      points.push([point[0], point[1]]);
    }
    if (points.length < 2) throw new Error("no_path");
    return { distanceMeters: props.totalDistance, durationSeconds: props.totalTime, points };
  }
  const modes = ["BIKE_ONLY", "SHORTEST"] as const;
  const results = await Promise.allSettled(modes.map(getRoute));
  const routes = Object.fromEntries(results.map((result, i) => [modes[i], result.status === "fulfilled" ? { data: result.value } : { error: "경로를 불러오지 못했습니다. 출발지와 목적지를 확인한 뒤 다시 시도해 주세요." }]));
  return Response.json({ routes, fetchedAt: new Date().toISOString() }, { headers });
}
