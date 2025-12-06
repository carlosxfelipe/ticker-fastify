import { test } from "node:test";
import * as assert from "node:assert";
import { build } from "../helper";

async function createAuthenticatedUser(app: any) {
  const response = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "root@example.com",
      password: "password123",
    },
  });
  return response.json().token;
}

test("GET / - deve retornar portfolio com labels e values", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  // Criar alguns assets
  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
      current_price: 35.0,
    },
  });

  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "VALE3",
      quantity: 50,
      average_price: 60.0,
      current_price: 70.0,
    },
  });

  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "ITUB4",
      quantity: 200,
      average_price: 25.0,
      current_price: 28.0,
    },
  });

  // Buscar portfolio
  const response = await app.inject({
    method: "GET",
    url: "/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  const portfolio = response.json();

  assert.ok(Array.isArray(portfolio.labels));
  assert.ok(Array.isArray(portfolio.values));
  assert.strictEqual(portfolio.labels.length, 3);
  assert.strictEqual(portfolio.values.length, 3);

  // Verificar que está ordenado por valor decrescente
  assert.strictEqual(portfolio.values[0] >= portfolio.values[1], true);
  assert.strictEqual(portfolio.values[1] >= portfolio.values[2], true);
});

test("GET / - deve retornar arrays vazios se não houver assets", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  const response = await app.inject({
    method: "GET",
    url: "/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  const portfolio = response.json();
  assert.deepStrictEqual(portfolio.labels, []);
  assert.deepStrictEqual(portfolio.values, []);
});

test("GET / - deve ordenar por valor decrescente", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  // Criar assets com valores conhecidos
  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "SMALL",
      quantity: 10,
      average_price: 10.0,
      current_price: 10.0,
    },
  }); // Valor: 100

  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "LARGE",
      quantity: 100,
      average_price: 50.0,
      current_price: 50.0,
    },
  }); // Valor: 5000

  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "MEDIUM",
      quantity: 20,
      average_price: 25.0,
      current_price: 25.0,
    },
  }); // Valor: 500

  const response = await app.inject({
    method: "GET",
    url: "/",
    headers: { authorization: `Bearer ${token}` },
  });

  const portfolio = response.json();
  assert.deepStrictEqual(portfolio.labels, ["LARGE", "MEDIUM", "SMALL"]);
  assert.deepStrictEqual(portfolio.values, [5000, 500, 100]);
});

test("GET / - deve usar current_price quando disponível", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "TEST1",
      quantity: 100,
      average_price: 10.0,
      current_price: 15.0,
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/",
    headers: { authorization: `Bearer ${token}` },
  });

  const portfolio = response.json();
  assert.strictEqual(portfolio.values[0], 1500); // 100 * 15, não 100 * 10
});

test("GET / - deve falhar sem autenticação", async (t) => {
  const app = await build(t);

  const response = await app.inject({
    method: "GET",
    url: "/",
  });

  assert.strictEqual(response.statusCode, 401);
});
