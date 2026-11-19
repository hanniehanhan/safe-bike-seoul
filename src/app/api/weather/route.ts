import { connection } from "next/server";

type Item = { baseDate: string; baseTime: string; fcstDate: string; fcstTime: string; category: string; fcstValue: string };
type WeatherResponse = { response?: { header?: { resultCode?: string }; body?: { items?: { item?: Item[] } } } };
const headers = { "Cache-Control": "no-store" };
function grid(lat: number, lon: number) {
  const rad = Math.PI / 180, re = 6371.00877 / 5, slat1 = 30 * rad, slat2 = 60 * rad, olon = 126 * rad, olat = 38 * rad;
  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2));
  const sf = Math.pow(Math.tan(Math.PI / 4 + slat1 / 2), sn) * Math.cos(slat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI / 4 + olat / 2), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI / 4 + lat * rad / 2), sn);
  let theta = lon * rad - olon; if (theta > Math.PI) theta -= 2 * Math.PI; if (theta < -Math.PI) theta += 2 * Math.PI; theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5) };
}
function issueTimes(now: Date) {
  const kst = new Date(now.getTime() + 9 * 3600000);
  const midnight = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const result: { date: string; time: string }[] = [];
  for (let day = 0; day < 2; day++) for (const hour of [23,20,17,14,11,8,5,2]) {
    const at = new Date(midnight - day * 86400000 + hour * 3600000);
    if (at.getTime() > kst.getTime()) continue;
    result.push({ date: at.toISOString().slice(0,10).replaceAll("-", ""), time: String(hour).padStart(2,"0") + "00" });
  }
  return result;
}
export async function GET(request: Request) {
  await connection();
  const params = new URL(request.url).searchParams;
  const latText = params.get("lat"), lngText = params.get("lng");
  const lat = Number(latText), lng = Number(lngText);
  if (!latText?.trim() || !lngText?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) return Response.json({ error: "출발지 좌표를 확인해 주세요." }, { status: 400, headers });
  let key = process.env.DATA_GO_KR_API_KEY;
  if (!key) return Response.json({ error: "공공데이터포털 API 키가 설정되지 않았습니다." }, { status: 503, headers });
  try { if (/%[a-f0-9]{2}/i.test(key)) key = decodeURIComponent(key); } catch { return Response.json({ error: "공공데이터포털 API 키 형식을 확인해 주세요." }, { status: 503, headers }); }
  const { nx, ny } = grid(lat, lng), now = new Date();
  try {
    for (const base of issueTimes(now)) {
      const url = new URL("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst");
      for (const [k,v] of Object.entries({ serviceKey:key, pageNo:"1", numOfRows:"1000", dataType:"JSON", base_date:base.date, base_time:base.time, nx:String(nx), ny:String(ny) })) url.searchParams.set(k,v);
      const response = await fetch(url, { cache:"no-store", signal:AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("upstream");
      const body: WeatherResponse = await response.json();
      const code = body.response?.header?.resultCode;
      if (code === "03") continue;
      if (code !== "00") throw new Error("upstream_error");
      const items = body.response?.body?.items?.item;
      if (!Array.isArray(items)) throw new Error("invalid");
      const kst = new Date(now.getTime()+9*3600000);
      const currentHour = kst.toISOString().slice(0,13).replace(/[-T]/g, "") + "00";
      const grouped = new Map<string, Record<string,string>>();
      for (const item of items) {
        if (!/^\d{8}$/.test(item.fcstDate) || !/^\d{4}$/.test(item.fcstTime) || !["TMP","POP","PTY"].includes(item.category)) continue;
        const target = item.fcstDate + item.fcstTime;
        if (target < currentHour) continue;
        const values = grouped.get(target) ?? {}; values[item.category] = item.fcstValue; grouped.set(target, values);
      }
      const found = [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).find(([,v])=>["TMP","POP","PTY"].every(k=>typeof v[k] === "string" && v[k].trim() !== ""));
      if (!found) continue;
      const [target, values] = found;
      const temp = Number(values.TMP), probability = Number(values.POP);
      if (!Number.isFinite(temp) || !Number.isFinite(probability) || probability < 0 || probability > 100 || !["0","1","2","3","4"].includes(values.PTY)) throw new Error("invalid_data");
      return Response.json({ source:"기상청 단기예보", nx, ny, baseDate:base.date, baseTime:base.time, fcstDate:target.slice(0,8), fcstTime:target.slice(8), temperatureC:temp, precipitationProbability:probability, precipitationType:values.PTY }, { headers });
    }
    return Response.json({ error:"조회 가능한 단기예보 데이터가 없습니다." }, { status:404, headers });
  } catch { return Response.json({ error:"기상청 단기예보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status:502, headers }); }
}
