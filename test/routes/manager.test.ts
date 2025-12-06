import { test } from "node:test";
import * as assert from "node:assert";
import { build } from "../helper";

async function createAuthenticatedUser(app: any) {
  const response = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "manager@example.com",
      password: "password123",
    },
  });
  return response.json().token;
}

test("GET /manager/ - deve listar assets do usuário autenticado", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  // Criar asset
  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.5,
      current_price: 32.0,
    },
  });

  // Listar assets
  const response = await app.inject({
    method: "GET",
    url: "/manager/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  const assets = response.json();
  assert.strictEqual(assets.length, 1);
  assert.strictEqual(assets[0].ticker, "PETR4");
  assert.strictEqual(assets[0].quantity, 100);
  assert.ok("percent_change" in assets[0]);
  assert.ok("total_invested" in assets[0]);
  assert.ok("current_value" in assets[0]);
  assert.ok("result" in assets[0]);
});

test("GET /manager/ - deve retornar array vazio se não houver assets", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  const response = await app.inject({
    method: "GET",
    url: "/manager/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  assert.deepStrictEqual(response.json(), []);
});

test("POST /manager/create/ - deve criar asset com ticker em maiúscula", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  const response = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "vale3",
      quantity: 50,
      average_price: 60.0,
      current_price: 65.0,
    },
  });

  assert.strictEqual(response.statusCode, 201);
  const asset = response.json();
  assert.strictEqual(asset.ticker, "VALE3");
  assert.strictEqual(asset.quantity, 50);
  assert.strictEqual(asset.percent_change, ((65 - 60) / 60) * 100);
});

test("POST /manager/create/ - deve calcular métricas corretamente", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  const response = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "ITUB4",
      quantity: 200,
      average_price: 25.0,
      current_price: 30.0,
    },
  });

  assert.strictEqual(response.statusCode, 201);
  const asset = response.json();
  assert.strictEqual(asset.total_invested, 200 * 25.0);
  assert.strictEqual(asset.current_value, 200 * 30.0);
  assert.strictEqual(asset.result, 200 * 30.0 - 200 * 25.0);
  assert.strictEqual(asset.percent_change, 20);
});

test("POST /manager/create/ - deve falhar sem autenticação", async (t) => {
  const app = await build(t);

  const response = await app.inject({
    method: "POST",
    url: "/manager/create/",
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
    },
  });

  assert.strictEqual(response.statusCode, 401);
});

test("GET /manager/edit/:id - deve retornar asset específico", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  // Criar asset
  const createResponse = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "BBDC4",
      quantity: 150,
      average_price: 20.0,
      current_price: 22.0,
    },
  });

  const assetId = createResponse.json().id;

  // Buscar asset
  const response = await app.inject({
    method: "GET",
    url: `/manager/edit/${assetId}`,
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  const asset = response.json();
  assert.strictEqual(asset.ticker, "BBDC4");
  assert.strictEqual(asset.id, assetId);
});

test("GET /manager/edit/:id - deve retornar 404 para asset inexistente", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  const response = await app.inject({
    method: "GET",
    url: "/manager/edit/99999",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 404);
});

test("POST /manager/edit/:id - deve atualizar asset existente", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  // Criar asset
  const createResponse = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
      current_price: 32.0,
    },
  });

  const assetId = createResponse.json().id;

  // Atualizar asset
  const response = await app.inject({
    method: "POST",
    url: `/manager/edit/${assetId}`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "PETR4",
      quantity: 150,
      average_price: 31.0,
      current_price: 33.0,
    },
  });

  assert.strictEqual(response.statusCode, 200);
  const updated = response.json();
  assert.strictEqual(updated.quantity, 150);
  assert.strictEqual(updated.average_price, 31.0);
  assert.strictEqual(updated.current_price, 33.0);
});

test("POST /manager/edit/:id - não deve permitir editar asset de outro usuário", async (t) => {
  const app = await build(t);

  // Usuário 1
  const token1 = await createAuthenticatedUser(app);
  const createResponse = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token1}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
    },
  });
  const assetId = createResponse.json().id;

  // Usuário 2
  const registerResponse = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "other@example.com",
      password: "password123",
    },
  });
  const token2 = registerResponse.json().token;

  // Tentar editar asset do usuário 1 com token do usuário 2
  const response = await app.inject({
    method: "POST",
    url: `/manager/edit/${assetId}`,
    headers: { authorization: `Bearer ${token2}` },
    payload: {
      ticker: "PETR4",
      quantity: 200,
      average_price: 35.0,
    },
  });

  assert.strictEqual(response.statusCode, 403);
});

test("POST /manager/delete/:id - deve deletar asset próprio", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  // Criar asset
  const createResponse = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
    },
  });

  const assetId = createResponse.json().id;

  // Deletar asset
  const response = await app.inject({
    method: "POST",
    url: `/manager/delete/${assetId}`,
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.json().message.includes("deletado"));

  // Verificar que foi deletado
  const listResponse = await app.inject({
    method: "GET",
    url: "/manager/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(listResponse.json().length, 0);
});

test("POST /manager/delete/:id - não deve permitir deletar asset de outro usuário", async (t) => {
  const app = await build(t);

  // Usuário 1
  const token1 = await createAuthenticatedUser(app);
  const createResponse = await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token1}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
    },
  });
  const assetId = createResponse.json().id;

  // Usuário 2
  const registerResponse = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "other2@example.com",
      password: "password123",
    },
  });
  const token2 = registerResponse.json().token;

  // Tentar deletar asset do usuário 1 com token do usuário 2
  const response = await app.inject({
    method: "POST",
    url: `/manager/delete/${assetId}`,
    headers: { authorization: `Bearer ${token2}` },
  });

  assert.strictEqual(response.statusCode, 403);
});
