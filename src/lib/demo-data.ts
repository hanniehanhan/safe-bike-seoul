import "server-only";

export const places = [
  { name: "여의나루역", address: "서울 영등포구 여의동로 343", lat: 37.5271, lng: 126.9329 },
  { name: "반포한강공원", address: "서울 서초구 신반포로11길 40", lat: 37.5109, lng: 126.9958 },
  { name: "마포대교", address: "서울 마포구 마포동", lat: 37.5331, lng: 126.9407 },
  { name: "한강대교", address: "서울 용산구 이촌동", lat: 37.5175, lng: 126.9587 },
  { name: "서울숲", address: "서울 성동구 뚝섬로 273", lat: 37.5445, lng: 127.0374 },
];

export function demoResponse(data: unknown) {
  return Response.json({ source: "example", isExample: true, data }, { headers: { "Cache-Control": "no-store" } });
}
