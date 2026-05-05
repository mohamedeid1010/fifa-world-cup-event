import http from 'http';

const data = JSON.stringify({
  kind: 'assistance',
  title: 'Test Assistance',
  ownerEmail: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/requests',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
