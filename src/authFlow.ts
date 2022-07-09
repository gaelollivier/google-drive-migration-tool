import { createServer } from 'http';

// NOTE: Not used at the moment

// Serve hello world on port 3000
createServer((req, res) => {
  console.log(req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
}).listen(3000);

console.log('Server running at http://localhost:3000/');
