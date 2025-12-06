#!/bin/bash

# Teste completo do backend Ticker Fastify
# 
# USO:
# 1. Em um terminal, inicie o servidor: npm run dev
# 2. Em outro terminal, execute: ./scripts/test-api.sh

BASE_URL="http://localhost:3000"
EMAIL="carlos@email.com"
PASSWORD="123456"

# Verificar se servidor está rodando
if ! curl -s "$BASE_URL/" > /dev/null 2>&1; then
  echo "❌ Servidor não está rodando em $BASE_URL"
  echo "Execute 'npm run dev' em outro terminal primeiro"
  exit 1
fi

echo "🧪 Testando API Ticker Fastify"
echo "================================"
echo ""

# 1. Login
echo "📝 1. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/accounts/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_RESPONSE" | python3 -m json.tool

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login!"
  exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""

# 2. Portfolio Home
echo "📊 2. Consultando portfolio (GET /)..."
curl -s -X GET "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 3. Listar Assets
echo "📋 3. Listando assets (GET /manager/)..."
curl -s -X GET "$BASE_URL/manager/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 4. Criar novo asset
echo "➕ 4. Criando novo asset (POST /manager/create/)..."
curl -s -X POST "$BASE_URL/manager/create/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL34","quantity":50,"average_price":150.50,"current_price":155.00}' | python3 -m json.tool
echo ""

# 5. Consultar settings
sleep 0.5
echo "⚙️  5. Consultando configurações (GET /settings/)..."
SETTINGS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/settings/" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$SETTINGS_RESPONSE" | tail -n1)
BODY=$(echo "$SETTINGS_RESPONSE" | sed '$d')
echo "HTTP Status: $HTTP_CODE"
if [ -n "$BODY" ] && [ "$BODY" != "null" ]; then
  echo "$BODY" | python3 -m json.tool
else
  echo "❌ Resposta vazia (Status: $HTTP_CODE)"
fi
echo ""

# 6. Trocar senha
sleep 0.5
echo "🔐 6. Testando troca de senha (POST /accounts/password_change/)..."
PASSWORD_CHANGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/accounts/password_change/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"'$PASSWORD'","new_password":"novaSenha123"}')
HTTP_CODE=$(echo "$PASSWORD_CHANGE_RESPONSE" | tail -n1)
BODY=$(echo "$PASSWORD_CHANGE_RESPONSE" | sed '$d')
echo "HTTP Status: $HTTP_CODE"
if [ -n "$BODY" ] && [ "$BODY" != "null" ]; then
  echo "$BODY" | python3 -m json.tool
else
  echo "❌ Resposta vazia (Status: $HTTP_CODE)"
fi
echo ""

# 7. Login com nova senha
echo "🔑 7. Fazendo login com nova senha..."
NEW_LOGIN=$(curl -s -X POST "$BASE_URL/accounts/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EMAIL\",\"password\":\"novaSenha123\"}")

echo "$NEW_LOGIN" | python3 -m json.tool

NEW_TOKEN=$(echo "$NEW_LOGIN" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$NEW_TOKEN" ]; then
  echo "❌ Erro ao fazer login com nova senha!"
  exit 1
fi

echo "✅ Login com nova senha realizado com sucesso!"
echo ""

# 8. Restaurar senha original
echo "♻️  8. Restaurando senha original..."
curl -s -X POST "$BASE_URL/accounts/password_change/" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"novaSenha123","new_password":"'$PASSWORD'"}' | python3 -m json.tool
echo ""

echo "================================"
echo "✅ Todos os testes concluídos!"
