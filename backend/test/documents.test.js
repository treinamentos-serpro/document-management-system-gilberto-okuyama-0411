// Testes de integração dos endpoints de documentos (Passo 2).
// Usa STORAGE_DIR temporário para não poluir backend/storage.

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));

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

function uploadFile({ content = 'conteudo de teste', name = 'relatorio.txt', user = 'user-a' } = {}) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), name);
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-user-id': user },
    body: form,
  });
}

test('POST /upload grava o arquivo e retorna os metadados públicos', async () => {
  const res = await uploadFile();
  assert.strictEqual(res.status, 201);

  const body = await res.json();
  assert.match(body.id, /^[0-9a-f-]{36}$/i);
  assert.strictEqual(body.originalName, 'relatorio.txt');
  assert.strictEqual(body.size, Buffer.byteLength('conteudo de teste'));
  assert.strictEqual(body.owner, 'user-a');
  assert.ok(body.uploadedAt);
  assert.strictEqual(body.storageName, undefined, 'não deve expor o nome físico');

  const storedFiles = fs.readdirSync(process.env.STORAGE_DIR);
  assert.ok(storedFiles.length >= 1, 'o arquivo deve ser gravado no diretório configurado');
});

test('POST /upload sem arquivo retorna 400 FILE_REQUIRED', async () => {
  const res = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-a' },
    body: new FormData(),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'FILE_REQUIRED');
});

test('GET /documents lista somente documentos do usuário, em ordem decrescente', async () => {
  await uploadFile({ name: 'a.txt', user: 'user-b' });
  await uploadFile({ name: 'b.txt', user: 'user-b' });
  await uploadFile({ name: 'alheio.txt', user: 'user-c' });

  const res = await fetch(`${baseUrl}/documents`, {
    headers: { 'x-user-id': 'user-b' },
  });
  assert.strictEqual(res.status, 200);

  const documents = await res.json();
  assert.strictEqual(documents.length, 2);
  assert.ok(documents.every((doc) => doc.owner === 'user-b'));
  assert.ok(documents[0].uploadedAt >= documents[1].uploadedAt);
});

test('GET /documents sem documentos retorna []', async () => {
  const res = await fetch(`${baseUrl}/documents`, {
    headers: { 'x-user-id': 'user-sem-docs' },
  });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), []);
});

test('GET /documents/:id/download retorna o conteúdo original', async () => {
  const uploaded = await (await uploadFile({ content: 'download ok', name: 'doc.txt', user: 'user-d' })).json();

  const res = await fetch(`${baseUrl}/documents/${uploaded.id}/download`, {
    headers: { 'x-user-id': 'user-d' },
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /attachment/);
  assert.strictEqual(await res.text(), 'download ok');
});

test('download de documento de outro usuário retorna 404', async () => {
  const uploaded = await (await uploadFile({ user: 'user-e' })).json();

  const res = await fetch(`${baseUrl}/documents/${uploaded.id}/download`, {
    headers: { 'x-user-id': 'user-intruso' },
  });
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
});

test('download com id malformado retorna 400 INVALID_DOCUMENT_ID', async () => {
  const res = await fetch(`${baseUrl}/documents/${encodeURIComponent('../nao-e-uuid')}/download`, {
    headers: { 'x-user-id': 'user-a' },
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'INVALID_DOCUMENT_ID');
});

test('download de documento inexistente retorna 404', async () => {
  const res = await fetch(
    `${baseUrl}/documents/550e8400-e29b-41d4-a716-446655440000/download`,
    { headers: { 'x-user-id': 'user-a' } }
  );
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
});
