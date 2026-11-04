// Testa o limite de tamanho de upload em arquivo separado: o node --test roda
// cada arquivo em processo próprio, permitindo configurar MAX_FILE_SIZE_BYTES
// antes de carregar o app sem afetar os demais testes.

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-limit-test-'));
process.env.MAX_FILE_SIZE_BYTES = '16';

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(process.env.STORAGE_DIR, { recursive: true, force: true });
});

function uploadFile(content) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'arquivo.txt');
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-limite' },
    body: form,
  });
}

test('upload acima do limite retorna 413 FILE_TOO_LARGE', async () => {
  const res = await uploadFile('x'.repeat(17));
  assert.strictEqual(res.status, 413);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'FILE_TOO_LARGE');
});

test('upload dentro do limite continua funcionando', async () => {
  const res = await uploadFile('x'.repeat(15));
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.size, 15);
});
