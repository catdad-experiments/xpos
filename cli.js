#!/usr/bin/env node

const http = require('http');
const handler = require('serve-handler');
const localtunnel = require('localtunnel');
const getPort = require('get-port');
const clipboardy = require('clipboardy');

(async () => {
  const port = await getPort();

  const server = http.createServer((request, response) => {
    // You pass two more arguments for config and middleware
    // More details here: https://github.com/vercel/serve-handler#options
    return handler(request, response);
  });

  await new Promise(r => server.listen(port, () => {
    console.log(`internally running at: http://localhost:${port}`);
    r();
  }));

  const tunnel = await localtunnel({ port });

  // the assigned public url for your tunnel
  // i.e. https://abcdefgjhij.localtunnel.me
  console.log(`externally running at: ${tunnel.url}`);

  await clipboardy.write(tunnel.url)
    .then(() => void console.log('  (url has been copied to clipboard)'))
    .catch(() => void console.error('  (failed to copy url to clipboard)'));

  tunnel.on('close', () => {
    // tunnels are closed
  });
})();
