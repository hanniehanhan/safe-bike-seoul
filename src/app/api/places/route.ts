import { demoResponse, places } from "@/lib/demo-data";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 100) return Response.json({ error: "검색어는 100자 이하여야 합니다." }, { status: 400 });
  return demoResponse(places.filter((place) => `${place.name} ${place.address}`.includes(query)));
}
