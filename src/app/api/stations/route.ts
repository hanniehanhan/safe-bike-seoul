import { connection } from "next/server";

type SeoulRow = { stationId?: string; stationName?: string; stationLatitude?: string; stationLongitude?: string; parkingBikeTotCnt?: string };
type SeoulResponse = { rentBikeStatus?: { list_total_count?: number; RESULT?: { CODE?: string }; row?: SeoulRow[] }; RESULT?: { CODE?: string } };
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  await connection();
  const key = process.env.SEOUL_API_KEY;
  if (!key) return Response.json({ error: "서울시 API 키가 설정되지 않았습니다." }, { status: 503, headers });
  try {
    const rows: SeoulRow[] = [];
    for (let start = 1; ; start += 1000) {
      if (start > 10000) throw new Error("limit");
      const url = `http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/bikeList/${start}/${start + 999}/`;
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("upstream");
      const body: SeoulResponse = await response.json();
      const result = body.rentBikeStatus;
      if ((body.RESULT?.CODE === "INFO-200" || result?.RESULT?.CODE === "INFO-200") && start > 1) break;
      if (result?.RESULT?.CODE !== "INFO-000" || !Array.isArray(result.row)) throw new Error("invalid");
      rows.push(...result.row);
      if (result.row.length < 1000) break;
    }
    const stations = rows.flatMap((row) => {
      const lat = Number(row.stationLatitude), lng = Number(row.stationLongitude);
      const count = row.parkingBikeTotCnt?.trim();
      if (!row.stationId || !row.stationName || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) return [];
      return [{ id: row.stationId, name: row.stationName, lat, lng, availableBikes: count && /^\d+$/.test(count) ? Number(count) : null }];
    });
    return Response.json({ source: "서울 열린데이터광장 bikeList", fetchedAt: new Date().toISOString(), data: stations }, { headers });
  } catch {
    return Response.json({ error: "서울시 대여소 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502, headers });
  }
}
