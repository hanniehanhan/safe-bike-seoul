import { connection } from "next/server";

type Row = { afos_fid?: number; spot_cd?: string; spot_nm?: string; sido_sgg_nm?: string; occrrnc_cnt?: number; caslt_cnt?: number; lo_crd?: string; la_crd?: string };
type Result = { resultCode?: string; totalCount?: number; items?: { item?: Row[] | Row } };
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  await connection();
  let key = process.env.DATA_GO_KR_API_KEY;
  if (!key) return Response.json({ error: "공공데이터포털 API 키가 설정되지 않았습니다." }, { status: 503, headers });
  try { if (/%[0-9a-f]{2}/i.test(key)) key = decodeURIComponent(key); } catch { return Response.json({ error: "공공데이터포털 API 키 형식을 확인해 주세요." }, { status: 503, headers }); }
  try {
    const currentYear = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date()));
    for (let year = currentYear - 1; year >= 2012; year--) {
      const rows: Row[] = [];
      let total = 0;
      for (let page = 1; ; page++) {
        if (page > 100) throw new Error("page_limit");
        const url = new URL("https://apis.data.go.kr/B552061/frequentzoneBicycle/getRestFrequentzoneBicycle");
        for (const [name, value] of Object.entries({ serviceKey: key, searchYearCd: String(year), siDo: "11", guGun: "", type: "json", numOfRows: "1000", pageNo: String(page) })) url.searchParams.set(name, value);
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error("upstream");
        const body: Result = await response.json();
        if (body.resultCode === "03") break;
        if (body.resultCode !== "00") throw new Error("upstream_error");
        total = Number(body.totalCount);
        if (!Number.isInteger(total) || total < 0) throw new Error("invalid_count");
        const item = body.items?.item;
        const pageRows = Array.isArray(item) ? item : item ? [item] : [];
        rows.push(...pageRows);
        if (rows.length >= total) break;
        if (!pageRows.length) throw new Error("incomplete");
      }
      if (rows.length === 0) continue;
      const data = rows.flatMap((row) => {
        const lat = Number(row.la_crd), lng = Number(row.lo_crd), count = Number(row.occrrnc_cnt);
        if (!row.spot_nm || !row.spot_cd || !row.la_crd || !row.lo_crd || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132 || !Number.isFinite(count)) return [];
        return [{ id: String(row.afos_fid ?? row.spot_cd), name: row.spot_nm, district: row.sido_sgg_nm ?? "", lat, lng, count, casualties: typeof row.caslt_cnt === "number" ? row.caslt_cnt : null, year }];
      });
      if (data.length !== rows.length) throw new Error("invalid_data");
      return Response.json({ source: "한국도로교통공단 교통사고분석시스템", year, data }, { headers });
    }
    return Response.json({ source: "한국도로교통공단 교통사고분석시스템", year: null, data: [] }, { headers });
  } catch {
    return Response.json({ error: "사고다발지역 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502, headers });
  }
}
