const https = require('https');

const postData = JSON.stringify({
  email: `test_${Date.now()}@skct.edu.in`,
  username: `user_${Date.now()}`,
  password: "Password123!"
});

const req = https.request({
  hostname: 'qr-project-1-0nv6.onrender.com',
  port: 443,
  path: '/api/auth/register',
  method: 'POST',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('REQ ERROR:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('TIMEOUT');
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();
