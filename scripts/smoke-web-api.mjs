const base = 'http://localhost:3000/api/auth';

async function run() {
  const email = `jm+${Date.now()}@example.com`;
  const password = 'password1234';

  const res1 = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, action: 'signup' }),
  });

  const setCookie = res1.headers.get('set-cookie');
  const json1 = await res1.json();
  console.log('signup status', res1.status, 'set-cookie?', !!setCookie, 'user', json1.user);

  if (!setCookie) {
    throw new Error('No set-cookie returned from /api/auth (signup)');
  }

  const resMe = await fetch('http://localhost:3000/api/auth/me', {
    headers: { cookie: setCookie },
  });
  console.log('me status', resMe.status, await resMe.text());

  const resWs = await fetch('http://localhost:3000/api/workspace', {
    headers: { cookie: setCookie },
  });
  const ws = await resWs.json();
  console.log('workspace status', resWs.status, ws.workspace?._id, ws.workspace?.slug);

  const resC = await fetch('http://localhost:3000/api/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: setCookie },
    body: JSON.stringify({ name: 'Test', email: 't@example.com', phone: '010-0000-0000', tags: ['vip'] }),
  });
  console.log('contact create', resC.status, await resC.text());

  const resConv = await fetch('http://localhost:3000/api/conversations', {
    headers: { cookie: setCookie },
  });
  console.log('conversations', resConv.status, await resConv.text());

  console.log('SMOKE_OK');
}

run().catch((e) => {
  console.error('SMOKE_FAIL', e);
  process.exit(1);
});
