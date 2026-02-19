# ddowa - AI-Powered Realtime Consultation Platform

실시간 AI 음성 상담 및 예약 관리 플랫폼입니다. Google Gemini Multimodal Live API를 사용하여 자연스러운 음성 상담을 제공하고, 예약과 결제를 자동화합니다.

## 특징

- **실시간 음성 상담**: Google Gemini AI와의 자연스러운 음성 대화
- **자동 자막**: 사용자와 AI 상담사의 실시간 자막
- **AI 음성**: 자연스러운 AI 음성 응답
- **도구 통합**: 예약, 결제 링크, 비즈니스 정보 등을 AI가 처리
- **통화 기록 관리**: Inbox에 통화 기록 저장, 자동 요약 및 의도 분석
- **고객 관리**: 연락처 자동 생성/업데이트
- **분석 대시보드**: 통화 통계 및 고객 분석

## 아키텍처

### 구조
```
ddowa-realtime/
├── apps/
│   ├── web/              # Next.js 15 (App Router) 프론트엔드
│   │   ├── src/
│   │   │   ├── app/      # 페이지 및 API 라우트
│   │   │   ├── lib/      # 유틸리티, API 클라이언트
│   │   │   └── middleware.ts  # 인증 미들웨어
│   │   └── package.json
│   └── server/           # Express + WebSocket 백엔드
│       ├── src/
│       │   ├── models/   # Mongoose 스키마
│       │   ├── providers/ # AI Provider 구현
│       │   ├── websocket/ # WebSocket 핸들러
│       │   ├── lib/      # JWT, 유틸리티
│       │   └── index.ts  # Express 메인 서버
│       └── package.json
└── packages/             # 공유 패키지 (앞으로 확장 가능)
```

### 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Express.js, WebSocket (ws), Mongoose
- **Database**: MongoDB (로컬 또는 MongoDB Atlas)
- **AI**: Google Gemini Multimodal Live API
- **Authentication**: JWT (httpOnly cookies)
- **Build System**: pnpm monorepo

## 로컬 설치 및 실행

### 요구사항

- Node.js 18+
- pnpm (or npm)
- MongoDB (로컬) 또는 MongoDB Atlas 계정

### 설치

1. **저장소 클론**
```bash
cd e:\project\ddowa-realtime
```

2. **환경 변수 설정**
```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 수정
# - MONGODB_URI: MongoDB 연결 주소
# - GEMINI_API_KEY: Google Gemini API 키
# - JWT_SECRET: JWT 서명 키
```

3. **의존성 설치**
```bash
pnpm install
```

### MongoDB 설정

#### 옵션 1: 로컬 MongoDB

```bash
# Windows에서 MongoDB 설치 후
mongod
```

#### 옵션 2: MongoDB Atlas

1. https://www.mongodb.com/cloud/atlas 에서 계정 생성
2. 클러스터 생성
3. 연결 문자열 복사
4. `.env` 파일의 `MONGODB_URI` 업데이트:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ddowa
```

### Google Gemini API 설정

1. [Google AI Studio](https://aistudio.google.com/)에서 API 키 생성
2. `.env` 파일의 `GEMINI_API_KEY` 업데이트:
```
GEMINI_API_KEY=your-api-key-here
```

### 개발 서버 실행

```bash
# 모든 앱 동시 실행 (npm/pnpm workspace)
pnpm dev

# 또는 개별 실행:

# Next.js 웹 앱 (포트 3000)
cd apps/web
pnpm dev

# Express 백엔드 (포트 8080)
cd apps/server
pnpm dev
```

### 접근

- 웹: http://localhost:3000
- WebSocket: ws://localhost:8080

## 사용 방법

### 1. 회원가입 및 로그인

```
http://localhost:3000 → [회원가입] → [로그인]
```

- 테스트 계정:
  - 이메일: `test@example.com`
  - 비밀번호: `password123`

### 2. 왼쪽 사이드바 네비게이션

- **대시보드**: KPI 및 최근 활동 확인
- **상담 시작**: AI와 실시간 음성 상담
- **받은 메시지**: 통화 기록 및 요약
- **연락처**: 고객 관리
- **분석**: 통계 및 트렌드
- **설정**: 상담사 설정, 사업 정보, 도구 설정

### 3. 상담 시작

1. **상담 시작 버튼** 클릭
2. 마이크 권한 허용
3. AI 상담사와 대화 시작
4. 실시간 자막 확인
5. **상담 종료** 버튼으로 종료

### 4. 데모 콜 페이지 (로그인 없음)

```
http://localhost:3000/call/demo
```

- 로그인 없이 AI와 상담 가능
- 기록은 demo workspace의 Inbox에 저장됨

## API/WebSocket 명세

### WebSocket 프로토콜

**클라이언트 → 서버:**

```javascript
// 상담 시작
{
  type: "call.start",
  workspaceSlug?: "demo"  // demo 페이지용
}

// 오디오 청크 전송
{
  type: "audio.chunk",
  conversationId: "conv_123...",
  pcm16ChunkBase64: "base64...",
  seq: 1,
  sampleRate: 16000
}

// 상담 종료
{
  type: "call.stop",
  conversationId: "conv_123..."
}
```

**서버 → 클라이언트:**

```javascript
// 상담 시작됨
{
  type: "call.started",
  conversationId: "conv_123..."
}

// STT 델타 (사용자 음성 → 텍스트)
{
  type: "stt.delta",
  textDelta: "I would like to..."
}

// Agent 델타 (AI 응답 텍스트)
{
  type: "agent.delta",
  textDelta: "Of course! I can..."
}

// TTS 오디오 (AI 음성)
{
  type: "tts.audio",
  pcm16ChunkBase64: "base64...",
  seq: 1,
  sampleRate: 16000
}

// Tool Call (AI가 도구 호출)
{
  type: "tool.call",
  toolCallId: "tool_123...",
  name: "createBooking",
  args: { startTime: "2024-02-20T10:00:00", ... }
}

// 상담 종료
{
  type: "call.ended",
  conversationId: "conv_123...",
  summary: "Customer booked...",
  intent: "booking_request",
  durationSec: 300
}

// 에러
{
  type: "error",
  code: "AUDIO_PROCESSING_ERROR",
  message: "Failed to process audio"
}
```

### REST API Routes (Next.js)

```
POST   /api/auth              # 회원가입/로그인
POST   /api/auth/logout       # 로그아웃
GET    /api/auth/me           # 현재 사용자 정보
GET    /api/workspace         # 워크스페이스 정보
GET    /api/agent-config      # 상담사 설정 조회
PUT    /api/agent-config      # 상담사 설정 저장
GET    /api/contacts          # 연락처 목록
POST   /api/contacts          # 연락처 생성
GET    /api/contacts/[id]     # 연락처 상세
PUT    /api/contacts/[id]     # 연락처 수정
DELETE /api/contacts/[id]     # 연락처 삭제
GET    /api/conversations     # 통화 기록 목록
GET    /api/bookings          # 예약 목록
POST   /api/bookings          # 예약 생성
```

## MongoDB 모델

### User
```
{
  email: String (unique),
  passwordHash: String,
  role: "admin" | "user",
  workspaceId: ObjectId
}
```

### Workspace
```
{
  name: String,
  slug: String (unique),
  timezone: String,
  businessInfo: {
    companyName: String,
    description: String,
    phone: String,
    website: String
  },
  hours: [{
    dayOfWeek: 0-6,
    startTime: "HH:mm",
    endTime: "HH:mm",
    isOpen: Boolean
  }]
}
```

### AgentConfig
```
{
  workspaceId: ObjectId (unique),
  tone: String,
  rules: [String],
  forbidden: [String],
  fallback: String,
  toolsEnabled: [String]
}
```

### Conversation
```
{
  workspaceId: ObjectId,
  contactId: ObjectId,
  channel: "web" | "api",
  status: "ongoing" | "completed" | "failed",
  startedAt: Date,
  endedAt: Date,
  durationSec: Number,
  summary: String,
  intent: String,
  meta: Mixed
}
```

### Message, Contact, Booking, PaymentLink
[생략 - 모델 정의는 src/models 참고]

## 주요 기능 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 회원가입/로그인 | ✅ 완료 | In-memory (실제 DB 연결 필요) |
| JWT 인증 | ✅ 완료 | httpOnly cookies |
| Middleware 보호 | ✅ 완료 | /app/* 경로 보호 |
| WebSocket 연결 | ✅ 완료 | 토큰 검증 |
| Gemini AI 통합 | ⚠️ 기초 | API 키 설정 후 테스트 필요 |
| STT/TTS | ⚠️ 기초 | 실제 Google Cloud API 연결 필요 |
| Tool 실행 | ✅ 구현 | 6가지 도구 기본 구현 |
| Inbox/Contacts | ✅ UI | DB 저장 구현 필요 |
| Analytics | ✅ UI | 데이터 수집 필요 |
| OpenAI Provider | ⚠️ Skeleton | 교체 가능하도록 설계됨 |

## 다음 단계 (TO-DO)

1. **실제 MongoDB 저장**: API 라우트와 WebSocket에서 데이터 실제 저장
2. **Google Cloud Speech-to-Text**: STT 구현
3. **Google Cloud Text-to-Speech**: TTS 구현 
4. **Stripe/PayPal 통합**: `getPaymentLink` 도구 실제 구현
5. **요청/응답 검증**: Zod 스키마로 입력 검증
6. **에러 핸들링**: 더 견고한 에러 처리
7. **로깅**: 프로덕션 로깅 추가
8. **배포**: Docker 또는 클라우드 배포 가이드
9. **테스트**: 단위/통합 테스트 작성
10. **모니터링**: Sentry 등 에러 추적

## 문제 해결

### WebSocket 연결 안 됨
- Express 서버 실행 확인: `http://localhost:8080/health`
- 포트 8080 사용 중인지 확인
- 방화벽 설정 확인

### 마이크 권한 오류
- 브라우저 마이크 권한 허용 필요
- HTTPS 또는 localhost에서 실행 필요

### MongoDB 연결 실패
- `mongod` 실행 중인지 확인
- Atlas 연결 문자열 확인 (IP 화이트리스트)

### Gemini API 오류
- API 키 확인
- API 할당량 확인
- 인터넷 연결 확인

## 라이선스

MIT

## 문의

문제가 있으면 GitHub Issues를 통해 보고해주세요.
