import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('🧪 Gemini API 연결 테스트 시작\n');

// 1. API Key 확인
console.log('1️⃣ API Key 확인:');
if (!GEMINI_API_KEY) {
  console.log('❌ GEMINI_API_KEY가 설정되지 않았습니다!');
  process.exit(1);
} else {
  console.log('✓ API Key 있음:', GEMINI_API_KEY.substring(0, 20) + '...');
}

// 2. API 호출 테스트
async function testGeminiAPI() {
  console.log('\n2️⃣ Gemini API 호출 테스트:');
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: '안녕하세요' }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    };

    console.log('  📤 API 요청 중...');
    console.log('  URL:', url.substring(0, 60) + '...');
    
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    console.log('✓ API 응답 성공! (Status: 200)');
    console.log('  응답:', response.data.candidates?.[0]?.content?.parts?.[0]?.text || '텍스트 없음');
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('⚠️ 할당량 초과 (429)');
      console.log('  이유:', error.response?.data?.error?.message);
      console.log('  💡 해결: 유료 계정으로 업그레이드 필요');
      console.log('  현재 상태: Mock 응답으로 자동 폴백됨');
    } else if (error.response?.status === 403) {
      console.log('❌ 인증 실패 (403)');
      console.log('  API Key가 잘못되었거나 구글 계정 설정 필요');
      console.log('  에러:', error.response?.data?.error?.message);
    } else if (error.response?.status === 400) {
      console.log('❌ 요청 형식 오류 (400)');
      console.log('  에러:', error.response?.data?.error?.message);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ 네트워크 연결 불가');
      console.log('  인터넷 연결을 확인하세요');
    } else {
      console.log('❌ API 호출 실패');
      console.log('  에러:', error.message);
      if (error.response?.data?.error?.message) {
        console.log('  상세:', error.response.data.error.message);
      }
    }
  }
}

// 3. 로컬 테스트 서버 체크
async function checkLocalServer() {
  console.log('\n3️⃣ 로컬 서버 상태:');
  
  try {
    const response = await axios.get('http://localhost:7777/health', {
      timeout: 2000,
    });
    console.log('✓ Express 서버 실행 중');
    console.log('  상태:', response.data.message);
  } catch (error) {
    console.log('❌ Express 서버 미실행');
    console.log('  터미널에서 서버 시작: npm run start');
  }
}

// 4. 요약
function printSummary() {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 테스트 완료\n');
  console.log('현재 구조:');
  console.log('  1. WebSocket: Express 서버');
  console.log('  2. Gemini AI: 실제 API 또는 Mock 폴백');
  console.log('  3. MongoDB: 대화 기록 저장');
  console.log('\n🚀 다음 단계:');
  console.log('  1. http://localhost:3000/test 접속');
  console.log('  2. "상담 시작" 버튼 클릭');
  console.log('  3. 메시지 로그 확인');
  console.log('═══════════════════════════════════════\n');
}

// 실행
(async () => {
  await checkLocalServer();
  await testGeminiAPI();
  printSummary();
})();
