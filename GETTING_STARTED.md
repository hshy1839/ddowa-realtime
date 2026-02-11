# Tohwa 빠른 시작 가이드

## 1️⃣ 환경 설정 (Windows PowerShell)

```powershell
# 프로젝트 디렉토리로 이동
cd e:\project\ddowa-realtime

# .env 파일 생성
Copy-Item .env.example .env

# 기본값으로 실행하려면 아래 환경 변수 설정
$env:GEMINI_API_KEY = "your-api-key"  # Google Gemini API 키 필요
$env:JWT_SECRET = "your-secret-key"
```

## 2️⃣ 의존성 설치

```powershell
# pnpm 설치 (아직 없다면)
npm install -g pnpm

# 프로젝트 의존성 설치
pnpm install
```

## 3️⃣ MongoDB 설정

### 옵션 A: 로컬 MongoDB (권장)

```powershell
# Windows에서 MongoDB Community Edition 설치
# https://www.mongodb.com/try/download/community

# MongoDB 시작 (설치 후)
mongod

# 다른 터미널에서 mongo shell로 테스트
mongo
> use tohwa
> db.createCollection("test")
```

### 옵션 B: MongoDB Atlas (클라우드)

1. https://www.mongodb.com/cloud/atlas 에서 계정 생성
2. 무료 클러스터 생성
3. 연결 문자열 복사
4. `.env` 파일 업데이트:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tohwa
```

## 4️⃣ Google Gemini API 설정

1. https://aistudio.google.com/ 접속
2. "Get API Key" 클릭
3. 새 프로젝트에서 API 키 생성
4. `.env` 파일 업데이트:
```
GEMINI_API_KEY=your-api-key-here
```

## 5️⃣ 개발 서버 실행

```powershell
# 새로운 PowerShell 터미널 2개 열기

# 터미널 1: Express 서버 (포트 7777)
cd e:\project\ddowa-realtime\apps\server
$env:PORT='7777'
npm run start

# 터미널 2: Next.js 웹 앱 (포트 3000)
cd e:\project\ddowa-realtime\apps\web
npm run dev
```

## 6️⃣ 브라우저에서 접근

```
홈: http://localhost:3000
로그인: http://localhost:3000/login
회원가입: http://localhost:3000/signup
대시보드: http://localhost:3000/app
상담 시작: http://localhost:3000/app/call
デモ コール: http://localhost:3000/call/demo

백엔드 헬스: http://localhost:7777/health
WebSocket: ws://localhost:7777
```

## 7️⃣ 테스트 계정

```
이메일: test@example.com
비밀번호: password123
```

## 🐛 문제 해결

### "pnpm: The term 'pnpm' is not recognized"
```powershell
npm install -g pnpm
```

### "MongoDB connection failed"
```powershell
# MongoDB 실행 확인
mongod

# 또는 Atlas 연결 문자열 확인
```

### "Cannot find module 'mongoose'"
```powershell
pnpm install
```

### WebSocket 연결 오류
- 포트 7777이 사용 중인지 확인
- 방화벽 설정 확인
- Express 서버 실행 확인

### 마이크 권한 없음
- 브라우저 마이크 권한 허용 필요
- Windows 설정 → 개인정보 → 마이크 확인

## 📁 주요 파일 구조

```
ddowa-realtime/
├── apps/web/                    # Next.js 프론트엔드
│   ├── src/app/
│   │   ├── page.tsx             # 랜딩 페이지
│   │   ├── login/               # 로그인
│   │   ├── signup/              # 회원가입
│   │   ├── app/                 # 보호된 영역
│   │   │   ├── call/            # 상담 시작
│   │   │   ├── inbox/           # 통화 기록
│   │   │   ├── contacts/        # 연락처
│   │   │   ├── analytics/       # 분석
│   │   │   └── settings/        # 설정
│   │   ├── api/                 # Next.js API Routes
│   │   └── call/[workspaceSlug] # 공개 데모
│   └── middleware.ts            # 인증 보호

├── apps/server/                 # Express 백엔드
│   ├── src/
│   │   ├── models/              # Mongoose 스키마
│   │   ├── providers/           # AI Provider
│   │   ├── websocket/           # WebSocket 핸들러
│   │   ├── lib/                 # JWT, 유틸
│   │   └── index.ts             # Express 메인

├── .env.example                 # 환경 변수 템플릿
├── pnpm-workspace.yaml          # pnpm 워크스페이스
└── README.md                    # 전체 문서
```

## 🚀 주요 기능

✅ **인증**: 회원가입/로그인, JWT, httpOnly 쿠키
✅ **실시간 통화**: WebSocket + Gemini AI
✅ **자막**: STT 델타 + Agent 델타
✅ **도구 통합**: 예약, 결제, 비즈니스 정보
✅ **UI 완성**: 모든 페이지 및 다크 테마
✅ **타입 안전**: TypeScript 전체 적용

## ⚠️ 추가 구현 필요

- [ ] MongoDB에 데이터 실제 저장
- [ ] Google Cloud Speech-to-Text (STT)
- [ ] Google Cloud Text-to-Speech (TTS)
- [ ] Stripe/PayPal 결제 링크
- [ ] 에러 핸들링 강화
- [ ] 프로덕션 배포

## 💡 팁

- **로그 확인**: 브라우저 개발자 도구 (F12) → Console
- **API 디버그**: Network 탭에서 요청/응답 확인
- **WebSocket 테스트**: PowerShell에서 다음 명령 실행
  ```powershell
  $webSocket = New-Object System.Net.WebSockets.ClientWebSocket
  $cts = New-Object System.Threading.CancellationTokenSource
  $cts.CancelAfter([System.TimeSpan]::FromSeconds(5))
  $webSocket.ConnectAsync([System.Uri]"ws://localhost:7777", $cts.Token).Wait()
  Write-Host "Connected!"
  ```
- **Hot Reload**: 파일 수정 시 자동 새로고침

## 📞 지원

문제가 있으면:
1. README.md의 "문제 해결" 섹션 확인
2. Express 로그 확인 (포트 7777)
3. Next.js 로그 확인 (포트 3000)
4. 브라우저 콘솔 확인 (F12)

## 🤖 AI 상담 에이전트

### Gemini AI 상태
- ✅ **API 연결**: 인증 완료 및 테스트 성공
- 🟡 **현재**: Mock 응답 사용 (Free tier 할당량 초과)
- 📝 **향후**: 유료 계정 또는 할당량 복구 후 실제 Gemini API 호출 가능

### Gemini API 설정 방법
1. https://aistudio.google.com/ 에서 계정 생성
2. 새 프로젝트에서 API 키 발급
3. `.env` 파일에 설정:
```
GEMINI_API_KEY=your-actual-api-key-here
```
4. `apps/server/src/providers/GeminiLiveProvider.ts`의 `getGeminiResponse()` 메서드를 `callRealGeminiAPI()`로 전환
