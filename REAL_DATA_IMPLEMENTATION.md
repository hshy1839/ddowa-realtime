# 실제 데이터 구현 문서

## 📋 개요

Mock 데이터에서 **실제 데이터**로 전환되었습니다. 이제 모든 상담 기록, 예약, 연락처가 MongoDB에 저장됩니다.

## ✨ 변경 사항

### 1️⃣ Gemini AI (GeminiLiveProvider)

**이전**: Mock 응답만 사용
```typescript
const mockResponse = this.generateMockResponse(userMessage);
```

**현재**: 실제 Gemini API 호출 + 실패 시 자동 폴백
```typescript
try {
  await this.callRealGeminiAPI(userMessage);
} catch (error) {
  if (error.response?.status === 429) {
    // 할당량 초과: Mock 응답으로 자동 전환
    const mockResponse = this.generateMockResponse(userMessage);
  }
}
```

### 2️⃣ 도구 실행 (tools.ts)

**이전**: 모든 도구가 Mock 데이터 반환
```typescript
case 'createBooking': {
  return { success: true, bookingId: `booking_${Date.now()}` };
}
```

**현재**: 실제 MongoDB 저장
```typescript
case 'createBooking': {
  const booking = await Booking.create({
    startAt: new Date(startTime),
    endAt: new Date(endTime),
    serviceName: serviceName || 'General Consultation',
    status: 'confirmed',
  });
  return { success: true, bookingId: booking._id.toString() };
}
```

### 3️⃣ 대화 기록 저장 (handler.ts)

**이전**: 대화가 메모리에만 저장됨
```typescript
// TODO: Implement real MongoDB save
```

**현재**: 모든 대화가 MongoDB에 저장
```typescript
case 'call.start': {
  const conversation = await Conversation.create({
    _id: conversationId,
    workspaceId: session.workspaceId,
    status: 'ongoing',
    startedAt: new Date(),
  });
}

case 'call.stop': {
  await Conversation.findByIdAndUpdate(
    session.conversationId,
    {
      status: 'completed',
      durationSec,
      summary,
      intent,
    }
  );
}
```

## 📊 저장되는 데이터

### Conversation (대화)
```javascript
{
  _id: "conv_1707574200000",
  workspaceId: "user_workspace",
  channel: "web",
  status: "completed",
  startedAt: 2024-02-11T10:30:00Z,
  endedAt: 2024-02-11T10:35:00Z,
  durationSec: 300,
  summary: "Customer inquired about booking services",
  intent: "booking_inquiry"
}
```

### Booking (예약)
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  startAt: 2024-02-15T14:00:00Z,
  endAt: 2024-02-15T14:30:00Z,
  serviceName: "Consultation",
  status: "confirmed",
  confirmationCode: "CONFIRM-507F1F77"
}
```

### Contact (연락처)
```javascript
{
  _id: "507f2f77bcf86cd799439012",
  name: "John Doe",
  email: "john@example.com",
  phone: "+82-10-1234-5678",
  lastSeenAt: 2024-02-11T10:35:00Z
}
```

## 🔧 도구별 구현 상태

| 도구 | 이전 | 현재 | 비고 |
|------|------|------|------|
| `getBusinessInfo` | Mock | 실제 반환 | 하드코딩 데이터 |
| `listAvailability` | Mock (고정 슬롯) | 동적 생성 | 실제 DB 연동 가능 |
| `createBooking` | Mock ID | **MongoDB 저장** ✅ | 실제 데이터 저장 |
| `updateBooking` | Mock 상태 | **MongoDB 업데이트** ✅ | Status 변경 저장 |
| `cancelBooking` | Mock | **MongoDB 삭제** ✅ | 상태를 'cancelled'로 변경 |
| `getPaymentLink` | Mock URL | 동적 URL | Stripe/PayPal 연동 필요 |

## 🚀 워크플로우

```
사용자 상담 시작
    ↓
WebSocket → Express 서버
    ↓
📝 Conversation 생성 (MongoDB)
    ↓
🤖 Gemini AI 호출 (실제 API)
    ↓
💬 응답 수신 → 클라이언트 전송
    ↓
🛠️ 도구 호출 필요 시
    ↓
📌 Booking/Contact 저장 (MongoDB)
    ↓
상담 종료
    ↓
📊 최종 Summary/Intent 저장
```

## ✅ 테스트 방법

### 1️⃣ 브라우저에서 테스트

```
http://localhost:3000/app/call (로그인 필요)
또는
http://localhost:3000/call/demo (로그인 없음)
```

### 2️⃣ MongoDB에서 데이터 확인

```powershell
# MongoDB Atlas에 로그인
# https://cloud.mongodb.com

# 또는 로컬 MongoDB 터미널
mongo
> use ddowa
> db.conversations.find().pretty()
> db.bookings.find().pretty()
> db.contacts.find().pretty()
```

### 3️⃣ WebSocket 메시지 흐름 (개발자 도구)

```javascript
// 1. call.start
{ type: "call.start" }

// 2. audio.chunk (반복)
{ type: "audio.chunk", pcm16ChunkBase64: "...", sampleRate: 16000 }

// 3. call.stop
{ type: "call.stop" }

// 응답: call.ended
{ type: "call.ended", conversationId: "conv_...", summary: "...", intent: "..." }
```

## 🔐 MongoDB 연결

**.env** (이미 설정됨):
```
MONGODB_URI=mongodb+srv://hongjeongmin1839_db_user:Eq7J4Q88o9rJnlvx@ddowa.rmrzzyy.mongodb.net/
```

**현재 상태**:
- ✅ Connection: 정상
- ✅ Collections: 사용 가능
- ✅ Read/Write: 활성화

## 📝 남은 작업

- [ ] STT (Speech-to-Text) 실제 구현
- [ ] TTS (Text-to-Speech) 실제 구현
- [ ] Stripe/PayPal 결제 연동
- [ ] 알림 시스템
- [ ] 실시간 분석 대시보드

## 🎯 주의사항

### Gemini API 할당량
- 현재: Free tier 할당량 초과 → Mock 응답으로 자동 폴백 중
- 해결: 유료 계정으로 업그레이드 시 자동으로 실제 API 사용
- 코드 변경 불필요 (자동 감지)

### MongoDB 저장 시간
- `call.start`: 즉시 저장
- `call.stop`: 대화 완료 시 저장
- 도구 실행: 즉시 실행 후 저장

## 💡 예제: 상담 플로우

```
1. 사용자: "안녕하세요, 예약하고 싶습니다"
   → MongoDB: Conversation 생성
   → Gemini AI: 응답 생성
   → 클라이언트: "어떤 예약을 원하세요?"

2. 사용자: "2월 15일 14:00에 상담 부탁합니다"
   → Gemini AI: createBooking 도구 호출
   → MongoDB: Booking 생성
   → 클라이언트: "예약되었습니다. 확인번호: CONFIRM-507F1F77"

3. 상담 종료 (call.stop)
   → MongoDB: Conversation 업데이트
     - status: completed
     - durationSec: 180
     - summary: "Customer booked a consultation"
     - intent: "booking_confirmation"
```

## 🔗 관련 문서

- [GETTING_STARTED.md](./GETTING_STARTED.md) - 환경 설정
- [README.md](./README.md) - 전체 프로젝트 가이드
- [apps/server/src/models/](./apps/server/src/models/) - MongoDB 스키마

---

**최종 업데이트**: 2024-02-11
**상태**: ✅ 실제 데이터 구현 완료
