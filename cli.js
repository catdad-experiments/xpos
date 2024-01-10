#!/usr/bin/env node

const http = require('http');
const https = require('https');
const handler = require('serve-handler');
const localtunnel = require('localtunnel');
const getPort = require('get-port');
const clipboardy = require('clipboardy');

const help = process.argv.includes('--help');
const noCache = process.argv.includes('--no-cache');

const portRange = getPort.makeRange(9000, 9100);

if (help) {
  console.log(`
  Expose a static server for the current directory to the public internet. Use responsibly.

  Flags:
    --no-cache   Set "Cache-Control: no-cache" header on all responses
    --help       Print this help message
  `);
  process.exit(0);
}

const noCacheSettings = {
  headers: [{
    source: '**/*',
    headers: [{
      key: 'Cache-Control',
      value: 'no-cache'
    }]
  }]
};

(async () => {
  const port = await getPort({ port: portRange });

  const server = http.createServer((request, response) => {
    // see for options: https://github.com/vercel/serve-handler#options
    return handler(request, response, {
      ...(noCache ? noCacheSettings : {})
    });
  });

  await new Promise(r => server.listen(port, () => r()));

  const { body: password } = await request('https://loca.lt/mytunnelpassword');

  console.log(`internally running at: http://localhost:${port}`);

  const tunnel = await localtunnel({ port });

  tunnel.on('close', () => {
    // tunnels are closed
  });

  tunnel.on('error', err => {
    console.error('the tunnel errored and does not work anymore\n', err);
    tunnel.close();
  });

  // the assigned public url for your tunnel
  // i.e. https://abcdefgjhij.localtunnel.me
  console.log(`externally running at: ${tunnel.url}`);
  console.log(`  password: ${password}\n`);

  await clipboardy.write(tunnel.url)
    .then(() => void console.log('(url has been copied to clipboard)'))
    .catch(() => void console.error('(failed to copy url to clipboard)'));
})().catch(err => {
  console.error(err);
  process.exit(1);
});

// this is stupid, but bringing in a dependency is also meh
const request = async (url, { method = 'GET', body = '', ...opts } = {}) => {
  const requestMethod = url.indexOf('https://') === 0 ? https.request : http.request;

  const response = await new Promise((resolve, reject) => {
    const req = requestMethod(url, { ...opts, method }, (res) => resolve(res));

    if (['post', 'put'].includes(method.toLowerCase())) {
      req.write(body);
    }

    req.end();
  });

  let responseBody = '';

  for await (const chunk of response) {
    responseBody += Buffer.from(chunk).toString();
  }

  return {
    status: response.statusCode,
    headers: response.headers,
    body: responseBody
  };
};
