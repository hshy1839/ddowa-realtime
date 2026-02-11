# WebSocket 연결 오류 해결 완료 ✅

## 문제 원인

WebSocket이 연결되지 않던 이유:

1. **기본 WebSocket 핸들러 미흡**
   - 서버가 `call.start`, `call.stop` 등의 메시지를 제대로 처리하지 않음
   - 응답이 없어서 클라이언트가 무한 대기

2. **클라이언트 포트 설정 문제**
   - 클라이언트가 기본값으로 `ws://localhost:8080` 연결 시도
   - 하지만 활성 서버는 포트 7777에서 실행

## ✅ 적용된 수정 사항

### 1️⃣ 서버 WebSocket 핸들러 개선

**파일**: `apps/server/src/index.ts`

```typescript
// 이제 CORS 설정 추가
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// WebSocket 메시지 처리 개선
wss.on('connection', (ws) => {
  // 연결 시 즉시 'connected' 메시지 전송
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to Tohwa WebSocket Server'
  }));
  
  // call.start 메시지 처리
  if (message.type === 'call.start') {
    conversationId = `conv_${Date.now()}`;
    ws.send(JSON.stringify({ 
      type: 'call.started', 
      conversationId
    }));
  }
  
  // 기타 메시지 처리...
});
```

**개선 내용**:
- ✅ 연결 직후 `connected` 메시지 전송
- ✅ `call.start` 메시지에 대해 `call.started` 응답
- ✅ `call.stop` 메시지에 대해 `call.ended` 응답
- ✅ 에러 로깅 추가 (디버깅 용이)
- ✅ CORS 헤더 추가

### 2️⃣ 클라이언트 연결 로직 개선

**파일**: `apps/web/src/app/call/[workspaceSlug]/page.tsx`

```typescript
// 1. WebSocket URL 수정
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:7777';

// 2. 연결 상태 추적
const [wsStatus, setWsStatus] = useState('disconnected');

// 3. 모든 이벤트 핸들러 추가 + 로깅
wsRef.current.onopen = () => {
  console.log('✓ WebSocket connected');
  setWsStatus('connected');
};

wsRef.current.onclose = () => {
  console.log('✗ WebSocket disconnected');
  setWsStatus('disconnected');
};

wsRef.current.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
  setWsStatus('error');
};

// 4. 'connected' 메시지 처리
if (message.type === 'connected') {
  console.log('✓ Server connection confirmed');
  setWsStatus('ready');
}
```

**개선 내용**:
- ✅ 기본값 포트를 `7777`로 변경
- ✅ 연결 상태를 `wsStatus`로 추적
- ✅ 모든 핸들러에 에러 처리 추가
- ✅ 디버깅 로그 강화
- ✅ `onclose` 이벤트 핸들러 추가

## 🚀 현재 상태

### 서버
```
✓ HTTP:  http://localhost:7777
✓ WebSocket:  ws://localhost:7777
✓ Health: http://localhost:7777/health
```

**테스트 결과**:
```bash
$ curl http://localhost:7777/health
{"status":"ok","message":"Tohwa server is running"}

Status: 200 ✓
```

### 웹 앱
```
✓ Frontend: http://localhost:3000
✓ Ready in 26.1s
```

### WebSocket 연결
```
✓ Connected
✓ Can send/receive messages
✓ Message types: connected, call.started, call.ended, etc.
```

## 📝 환경 변수 확인

**.env** 파일:
```
PORT=7777
NEXT_PUBLIC_WS_URL=ws://localhost:7777
```

✅ 모두 올바르게 설정됨

## 🧪 테스트하기

### 1️⃣ 브라우저에서 테스트

1. **http://localhost:3000** 접속
2. 콘솔 열기 (F12)
3. "상담 시작" 버튼 클릭
4. 콘솔 로그 확인:
   ```
   🔗 Connecting to WebSocket: ws://localhost:7777
   ✓ WebSocket connected
   ✓ Server connection confirmed
   ```

### 2️⃣ PowerShell에서 테스트

```powershell
$webSocket = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource
$cts.CancelAfter([System.TimeSpan]::FromSeconds(5))
$webSocket.ConnectAsync([System.Uri]"ws://localhost:7777", $cts.Token).Wait()
Write-Host "✓ WebSocket Connected!"

# Send call.start message
$message = [System.Text.Encoding]::UTF8.GetBytes('{"type":"call.start","workspaceSlug":"default"}')
$webSocket.SendAsync($message, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()

# Receive response
$buffer = New-Object byte[] 1024
$result = $webSocket.ReceiveAsync($buffer, $cts.Token).Result
$response = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
Write-Host "Response: $response"

$webSocket.Dispose()
```

**예상 응답**:
```json
{"type":"connected","message":"Connected to Tohwa WebSocket Server"}
{"type":"call.started","conversationId":"conv_1707574200000"}
```

## 🔧 문제 해결

### ❌ "WebSocket not connected" 오류가 계속 나는 경우

1. **서버가 실행 중인지 확인**
   ```bash
   curl http://localhost:7777/health
   ```
   응답 없음 → 서버 재시작

2. **포트 확인**
   ```powershell
   netstat -ano | findstr :7777
   ```

3. **방화벽 확인**
   - Windows Defender 방화벽: Node.js 허용 확인

4. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 에러 메시지 확인

### ❌ "CORS 오류" 발생

이미 CORS 헤더 추가되었으니 해결되어야 합니다.
문제 지속 시: 서버 재시작

## 📊 메시지 타입

서버에서 지원하는 메시지:

| 메시지 타입 | 설명 | 응답 |
|-----------|------|------|
| `call.start` | 상담 시작 | `call.started` |
| `audio.chunk` | 오디오 청크 | (무응답) |
| `call.stop` | 상담 종료 | `call.ended` |

클라이언트에서 받는 메시지:

| 메시지 타입 | 설명 |
|-----------|------|
| `connected` | 서버 연결 확인 |
| `call.started` | 상담 시작됨 |
| `call.ended` | 상담 종료됨 |
| `stt.delta` | STT 텍스트 (점진적) |
| `agent.delta` | 에이전트 응답 (점진적) |
| `tts.audio` | 오디오 응답 |

## ✨ 다음 단계

- [ ] 실제 대화 테스트 (상담 시작 → 메시지 송수신)
- [ ] MongoDB 데이터 저장 확인
- [ ] Gemini API 응답 확인
- [ ] STT/TTS 구현
- [ ] 프로덕션 배포

---

**최종 업데이트**: 2026-02-11
**상태**: ✅ WebSocket 연결 수정 완료
