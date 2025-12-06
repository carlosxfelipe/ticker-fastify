import { test } from "node:test";
import * as assert from "node:assert";
import { build } from "../helper";

test("POST /accounts/register/ - deve registrar novo usuário", async (t) => {
  const app = await build(t);

  const response = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "test@example.com",
      password: "testpass123",
    },
  });

  assert.strictEqual(response.statusCode, 201);
  const json = response.json();
  assert.ok(json.token);
  assert.strictEqual(json.user.email, "test@example.com");
});

test("POST /accounts/register/ - deve falhar com email duplicado", async (t) => {
  const app = await build(t);

  // Primeiro registro
  await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "duplicate@example.com",
      password: "testpass123",
    },
  });

  // Segundo registro com mesmo email
  const response = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "duplicate@example.com",
      password: "anotherpass",
    },
  });

  assert.strictEqual(response.statusCode, 400);
  assert.ok(response.json().message.includes("já existe"));
});

test("POST /accounts/login/ - deve fazer login com credenciais válidas", async (t) => {
  const app = await build(t);

  // Criar usuário
  await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "login@example.com",
      password: "password123",
    },
  });

  // Login
  const response = await app.inject({
    method: "POST",
    url: "/accounts/login/",
    payload: {
      username: "login@example.com",
      password: "password123",
    },
  });

  assert.strictEqual(response.statusCode, 200);
  const json = response.json();
  assert.ok(json.token);
  assert.strictEqual(json.user.email, "login@example.com");
});

test("POST /accounts/login/ - deve falhar com senha incorreta", async (t) => {
  const app = await build(t);

  // Criar usuário
  await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "wrongpass@example.com",
      password: "correctpass",
    },
  });

  // Tentar login com senha errada
  const response = await app.inject({
    method: "POST",
    url: "/accounts/login/",
    payload: {
      username: "wrongpass@example.com",
      password: "wrongpass",
    },
  });

  assert.strictEqual(response.statusCode, 401);
  assert.ok(response.json().message.includes("inválidas"));
});

test("POST /accounts/password_change/ - deve trocar senha com autenticação", async (t) => {
  const app = await build(t);

  // Criar usuário
  const registerResponse = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "changepass@example.com",
      password: "oldpassword",
    },
  });

  const token = registerResponse.json().token;

  // Trocar senha
  const response = await app.inject({
    method: "POST",
    url: "/accounts/password_change/",
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      old_password: "oldpassword",
      new_password: "newpassword123",
    },
  });

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.json().message.includes("alterada"));

  // Verificar que a nova senha funciona
  const loginResponse = await app.inject({
    method: "POST",
    url: "/accounts/login/",
    payload: {
      username: "changepass@example.com",
      password: "newpassword123",
    },
  });

  assert.strictEqual(loginResponse.statusCode, 200);
});

test("POST /accounts/password_change/ - deve falhar sem autenticação", async (t) => {
  const app = await build(t);

  const response = await app.inject({
    method: "POST",
    url: "/accounts/password_change/",
    payload: {
      old_password: "oldpass",
      new_password: "newpass",
    },
  });

  assert.strictEqual(response.statusCode, 401);
});

test("POST /accounts/logout/ - deve fazer logout", async (t) => {
  const app = await build(t);

  // Criar e logar usuário
  const registerResponse = await app.inject({
    method: "POST",
    url: "/accounts/register/",
    payload: {
      email: "logout@example.com",
      password: "password123",
    },
  });

  const token = registerResponse.json().token;

  // Logout
  const response = await app.inject({
    method: "POST",
    url: "/accounts/logout/",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.json().message.includes("sucesso"));
});
