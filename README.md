# Ticker Fastify - Portfolio Management API

Backend API para gerenciamento de portfólio de ativos, migrado de Django para Fastify.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Popular banco de dados com dados de teste
npm run seed

# Iniciar servidor de desenvolvimento (com watch mode)
npm run dev

# Ou iniciar servidor sem watch (recomendado para testes)
npm run start:dev

# Build e produção
npm start

# Executar testes
npm test
```

O servidor estará disponível em `http://localhost:3000`

**📚 Documentação da API (Swagger)**: `http://localhost:3000/docs`

### Credenciais de teste

- **Email**: carlos@email.com
- **Senha**: 123456

## 📁 Estrutura do Projeto

```
src/
├── plugins/
│   ├── 00-db.ts          # SQLite database setup
│   ├── 01-auth.ts        # JWT authentication
│   ├── 02-cors.ts        # CORS configuration
│   └── 03-swagger.ts     # Swagger/OpenAPI documentation
├── routes/
│   ├── accounts/         # Autenticação e gerenciamento de conta
│   ├── manager/          # CRUD de assets
│   ├── settings/         # Configurações de conta
│   └── root.ts           # Portfolio home
├── schemas.ts            # OpenAPI schemas compartilhados
└── app.ts

scripts/
├── seed.ts               # Database seeding
└── test-api.sh           # Script de testes da API
```

## 🔑 Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação. Após o login, inclua o token no header:

```
Authorization: Bearer <token>
```

## 📡 Endpoints

### Autenticação (`/accounts/*`)

#### POST `/accounts/register/`

Criar novo usuário.

```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Resposta (201)**:

```json
{
  "message": "Usuário criado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### POST `/accounts/login/`

Fazer login.

```json
{
  "username": "user@example.com",
  "password": "senha123"
}
```

**Resposta (200)**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### POST `/accounts/logout/`

🔒 Requer autenticação. Encerrar sessão (no lado cliente, remover o token).

#### POST `/accounts/password_change/`

🔒 Requer autenticação. Alterar senha.

```json
{
  "old_password": "senha_atual",
  "new_password": "nova_senha"
}
```

### Portfolio (`/`)

#### GET `/`

🔒 Requer autenticação. Retorna dados do portfolio ordenados por valor.

**Resposta (200)**:

```json
{
  "labels": ["ITUB4", "VALE3", "SNAG11", "AFHI11", "PETR4", "BBDC4", "COCA34"],
  "values": [8328.0, 3370.0, 6102.0, 7573.6, 3179.0, 2947.5, 7772.4]
}
```

### Gerenciamento de Assets (`/manager/*`)

#### GET `/manager/`

🔒 Requer autenticação. Listar todos os assets com métricas calculadas.

**Resposta (200)**:

```json
[
  {
    "id": 1,
    "user_id": 1,
    "ticker": "PETR4",
    "quantity": 100,
    "average_price": 31.24,
    "current_price": 31.79,
    "percent_change": 1.76,
    "total_invested": 3124.0,
    "current_value": 3179.0,
    "result": 55.0
  }
]
```

**Métricas calculadas**:

- `percent_change`: Variação percentual entre preço médio e atual
- `total_invested`: Quantidade × Preço médio
- `current_value`: Quantidade × Preço atual
- `result`: Lucro/prejuízo (current_value - total_invested)

#### POST `/manager/create/`

🔒 Requer autenticação. Criar novo asset.

```json
{
  "ticker": "PETR4",
  "quantity": 100,
  "average_price": 31.24,
  "current_price": 31.79
}
```

**Nota**: O ticker é automaticamente convertido para MAIÚSCULAS.

#### GET `/manager/edit/:id`

🔒 Requer autenticação. Buscar asset por ID (com validação de ownership).

#### POST `/manager/edit/:id`

🔒 Requer autenticação. Atualizar asset existente.

```json
{
  "ticker": "PETR4",
  "quantity": 150,
  "average_price": 30.5,
  "current_price": 32.0
}
```

#### POST `/manager/delete/:id`

🔒 Requer autenticação. Deletar asset.

### Configurações (`/settings/*`)

#### GET `/settings/`

🔒 Requer autenticação. Obter dados da conta.

**Resposta (200)**:

```json
{
  "id": 1,
  "username": "carlos@email.com",
  "email": "carlos@email.com"
}
```

#### POST `/settings/delete/`

🔒 Requer autenticação. Deletar conta (remove usuário e todos os assets em cascata).

**Resposta (200)**:

```json
{
  "message": "Conta deletada com sucesso",
  "deleted": true
}
```

## 🗄️ Banco de Dados

### Schema

**users**

- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `username`: TEXT UNIQUE NOT NULL
- `email`: TEXT NOT NULL
- `password`: TEXT NOT NULL (bcrypt hash)

**assets**

- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id`: INTEGER NOT NULL (FK → users.id ON DELETE CASCADE)
- `ticker`: TEXT NOT NULL
- `quantity`: INTEGER NOT NULL
- `average_price`: REAL NOT NULL
- `current_price`: REAL

### Seed Data

O script `npm run seed` cria:

- 1 usuário: carlos@email.com / 123456
- 7 assets de exemplo (PETR4, VALE3, ITUB4, BBDC4, COCA34, AFHI11, SNAG11)

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
JWT_SECRET=seu-secret-aqui
PORT=3000
SQLITE_DATABASE=data/app.db
NODE_ENV=development
CORS_ORIGIN=*
```

## 🧪 Testes

```bash
npm test
```

## 📦 Build

```bash
npm run build:ts
```

## 🚢 Deploy

O projeto está pronto para deploy no Render, Fly.io ou similar. Certifique-se de:

1. Definir `JWT_SECRET` nas variáveis de ambiente
2. Configurar `SQLITE_DATABASE` ou migrar para PostgreSQL
3. Executar `npm run seed` após o primeiro deploy (opcional)

## 🔒 Segurança

- ✅ Senhas hasheadas com bcrypt (cost 10)
- ✅ JWT para autenticação stateless
- ✅ Validação de ownership em todas as operações de assets
- ✅ Foreign keys com DELETE CASCADE
- ✅ CORS configurável via env
- ✅ Validação de schemas com Fastify

## 📝 Diferenças do Django Original

| Django                     | Fastify                         |
| -------------------------- | ------------------------------- |
| Session-based auth         | JWT tokens                      |
| Autoincrement PK (default) | Autoincrement PK (implementado) |
| `/accounts/login/` (POST)  | `/accounts/login/` (POST) ✅    |
| `/manager/`                | `/manager/` ✅                  |
| ORM QuerySets              | SQL direto com better-sqlite3   |
| CSRF tokens                | JWT (stateless)                 |

## 🛠️ Stack Tecnológica

- **Runtime**: Node.js 20+
- **Framework**: Fastify 5
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT (@fastify/jwt)
- **Password**: bcrypt (bcryptjs)
- **TypeScript**: 5.9
- **CORS**: @fastify/cors

## 📚 Scripts Disponíveis

- `npm start` - Inicia servidor de produção (build + start)
- `npm run dev` - Desenvolvimento com watch mode (recompila automaticamente)
- `npm run start:dev` - Inicia servidor sem watch (ideal para testes com `./scripts/test-api.sh`)
- `npm run build:ts` - Compila TypeScript
- `npm run seed` - Popula banco com dados de teste
- `npm test` - Executa testes unitários com cobertura

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

ISC
