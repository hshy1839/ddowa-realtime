import axios from 'axios';

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDrwpbatOJWSPYW3Xx0xF7rUvsfkxT4GPw';

console.log('🔗 Testing Gemini API Connection...');
console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(-10)}`);
console.log('Model: gemini-1.5-flash (optimized for free tier)');

axios.post(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
  {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Say "Gemini is working!" in 5 words or less.' }],
      },
    ],
  }
)
  .then((res) => {
    console.log('\n✅ Gemini API Response:');
    const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(text);
    console.log('\n✓ Connection successful!');
  })
  .catch((err) => {
    console.log('\n❌ Gemini API Error:');
    if (err.response?.data) {
      console.log(JSON.stringify(err.response.data, null, 2));
    } else {
      console.log(err.message);
    }
  });
