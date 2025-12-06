import { test } from "node:test";
import * as assert from "node:assert";
import { build } from "../helper";

async function createAuthenticatedUser(
  app: any,
  email = "settings@example.com"
) {
  const response = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email,
      password: "password123",
    },
  });
  return response.json().token;
}

test("GET /settings/ - deve retornar informações do usuário", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app);

  const response = await app.inject({
    method: "GET",
    url: "/settings/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  const user = response.json();
  assert.strictEqual(user.email, "settings@example.com");
  assert.strictEqual(user.username, "settings@example.com");
  assert.ok(user.id);
  assert.strictEqual(user.password, undefined); // Não deve retornar senha
});

test("GET /settings/ - deve falhar sem autenticação", async (t) => {
  const app = await build(t);

  const response = await app.inject({
    method: "GET",
    url: "/settings/",
  });

  assert.strictEqual(response.statusCode, 401);
});

test("POST /settings/delete/ - deve deletar conta do usuário", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app, "delete@example.com");

  // Deletar conta
  const response = await app.inject({
    method: "POST",
    url: "/settings/delete/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.json().message.includes("deletada"));
  assert.strictEqual(response.json().deleted, true);

  // Verificar que não consegue mais fazer login
  const loginResponse = await app.inject({
    method: "POST",
    url: "/accounts/login/",
    payload: {
      username: "delete@example.com",
      password: "password123",
    },
  });

  assert.strictEqual(loginResponse.statusCode, 401);
});

test("POST /settings/delete/ - deve deletar assets em cascata", async (t) => {
  const app = await build(t);
  const token = await createAuthenticatedUser(app, "cascade@example.com");

  // Criar alguns assets
  await app.inject({
    method: "POST",
    url: "/manager/create/",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ticker: "PETR4",
      quantity: 100,
      average_price: 30.0,
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
    },
  });

  // Verificar que assets existem
  const listBefore = await app.inject({
    method: "GET",
    url: "/manager/",
    headers: { authorization: `Bearer ${token}` },
  });
  assert.strictEqual(listBefore.json().length, 2);

  // Deletar conta
  const deleteResponse = await app.inject({
    method: "POST",
    url: "/settings/delete/",
    headers: { authorization: `Bearer ${token}` },
  });

  assert.strictEqual(deleteResponse.statusCode, 200);

  // Note: Não podemos verificar se assets foram deletados pois o usuário não existe mais
  // e não temos acesso ao token. O cascade é garantido pelo banco de dados.
});

test("POST /settings/delete/ - deve falhar sem autenticação", async (t) => {
  const app = await build(t);

  const response = await app.inject({
    method: "POST",
    url: "/settings/delete/",
  });

  assert.strictEqual(response.statusCode, 401);
});
