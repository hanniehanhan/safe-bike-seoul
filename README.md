# Safe Bike Seoul

서울시 따릉이 대여소, 카카오맵 자전거 경로, 한국도로교통공단의 사고다발지역 과거 통계, 기상청 단기예보를 함께 보여주는 Next.js·TypeScript 앱입니다.

장소 검색은 현재 다섯 개의 예시 장소만 제공합니다. 사고정보는 과거 통계이며 경로의 안전을 보장하거나 위험도를 확정하지 않습니다. 기상정보는 실시간 관측값이 아닌 단기예보입니다.

## 로컬 실행

Node.js 24 LTS와 npm을 권장합니다. 프로젝트 폴더에서 다음 명령을 실행하세요.

```bash
npm ci
cp .env.local.example .env.local
# .env.local을 열어 각 키의 값을 직접 입력합니다.
npm run dev
```

이미 `.env.local`을 작성했다면 복사 명령은 생략하세요. [http://localhost:3000](http://localhost:3000)에서 확인합니다. 환경변수를 변경했다면 개발 서버를 재시작하세요.

## 환경변수

`.env.local.example`에는 변수 이름만 있습니다. 실제 값은 `.env.local`에 입력하며 Git에 올리지 않습니다.

| 변수 | 용도 | 노출 범위 |
| --- | --- | --- |
| `SEOUL_API_KEY` | 서울 열린데이터광장 따릉이 `bikeList` | 서버 전용 |
| `DATA_GO_KR_API_KEY` | 공공데이터포털 사고다발지역 및 기상청 단기예보 | 서버 전용 |
| `KAKAO_REST_API_KEY` | 카카오맵 자전거 경로 REST API | 서버 전용 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오맵 JavaScript SDK | 브라우저에 공개됨 |

공공데이터포털에서 자전거 교통사고 다발지역과 기상청 단기예보 조회서비스를 각각 활용 신청해야 합니다. JavaScript 키는 비밀키가 아니므로 Kakao Developers에서 허용 도메인을 제한하세요.

## GitHub 및 Vercel 배포

1. `.env.local`이 Git에서 제외되어 있는지 `git status --short` 및 `git check-ignore -v .env.local`로 확인합니다. `.env.local.example`은 값 없이 커밋할 수 있습니다.
2. 변경사항을 검토하고 커밋한 후 GitHub에 저장소를 만들고 푸시합니다. 인증키가 들어간 파일이나 로그를 커밋하지 마세요.
3. Vercel에서 **Add New → Project**를 선택해 GitHub 저장소를 가져옵니다. 이 프로젝트가 저장소 루트라면 Root Directory는 기본값을 사용합니다. 저장소의 하위 폴더라면 해당 프로젝트 폴더를 지정합니다. Framework Preset은 Next.js를 사용합니다.
4. Vercel 프로젝트의 환경변수 설정에서 위 네 변수를 직접 입력하고 사용할 Production 및 Preview 환경을 선택합니다. 서버 전용 키는 공개 변수로 만들지 않습니다. Node.js는 Vercel이 지원하는 24.x를 사용합니다.
5. 배포 후 생성된 실제 `https://...` 주소를 확인합니다. Kakao Developers에서 **앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인**에 해당 도메인을 등록하고 저장합니다. 커스텀 도메인이나 Preview 주소에서 지도를 사용할 경우 그 주소도 각각 등록해야 합니다. `http://localhost:3000`과 배포 HTTPS 주소는 서로 다른 도메인입니다.
6. Vercel의 환경변수를 추가하거나 변경했다면 다시 배포하고, 배포된 사이트에서 지도·대여소·두 경로·사고정보·날씨 응답을 확인합니다. Preview URL은 배포마다 달라질 수 있으므로 등록되지 않은 주소에서는 지도 SDK가 실패할 수 있습니다.

`NEXT_PUBLIC_KAKAO_JS_KEY`는 빌드 시 브라우저 코드에 포함됩니다. 다른 세 키는 서버에서만 사용하며 Vercel 환경변수로만 관리하세요. Vercel에 키를 입력한 뒤에는 채팅, README, 이슈 또는 저장소에 값을 붙여 넣지 마세요.

## API와 검증

- `GET /api/places?q=검색어`: 예시 장소 검색
- `GET /api/stations`: 서울시 따릉이 대여소
- `POST /api/routes`: 카카오맵 자전거도로 우선 및 최단 경로
- `GET /api/accidents`: 서울시 자전거 사고다발지역 과거 통계
- `GET /api/weather?lat=위도&lng=경도`: 기상청 단기예보

대여소는 출발지 기준 직선거리 순으로 보여주며, 사고다발지역은 선택 경로 중심선에서 200m 이내인 지역을 비교합니다. 배포 환경에서는 외부 API 접근, 활용 승인, 할당량, Kakao 도메인 설정을 별도로 확인해야 합니다.

```bash
npm run lint
npm run build
```
