# Especificação para Migração: Django → Fastify

Este documento contém todas as informações necessárias para recriar o backend do projeto **Ticker Portfolio** em Fastify (Node.js), mantendo **exatamente** a mesma estrutura de dados, rotas e lógica de negócio.

---

## 1. Modelos de Dados

### 1.1 User (modelo padrão de autenticação)
```python
# Django usa django.contrib.auth.models.User
# Campos principais:
- id (autoincrement, PK)
- username (string, unique) → usar email como username
- email (string)
- password (string, hashed)
```

### 1.2 Asset
```python
class Asset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assets")
    ticker = models.CharField(max_length=20)
    quantity = models.IntegerField()
    average_price = models.FloatField()
    current_price = models.FloatField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.ticker:
            self.ticker = self.ticker.upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticker} ({self.user.username})"
```

**Equivalente SQL/Prisma/TypeORM:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  average_price FLOAT NOT NULL,
  current_price FLOAT
);
```

**Regra importante:** Ticker deve ser **sempre convertido para UPPERCASE** antes de salvar.

---

## 2. Rotas e Endpoints

### 2.1 Autenticação e Contas (`/accounts/*`)

#### `POST /accounts/register/`
- Cria novo usuário
- Body: `{ email, password }`
- Validações:
  - Email único (username = email)
  - Retornar erro se email já existir
- Após criar: fazer login automático e redirecionar para `/` (home)

#### `POST /accounts/login/`
- Autenticar usuário
- Body: `{ username, password }` (username é o email)
- Retornar sessão/token

#### `POST /accounts/logout/`
- Encerrar sessão
- Protegido: requer autenticação

#### `POST /accounts/password_change/` (ou `GET` + `POST`)
- Trocar senha do usuário logado
- Body: `{ old_password, new_password }`
- Protegido: requer autenticação

### 2.2 Configurações (`/settings/*`)

#### `GET /settings/`
- Página de configurações da conta
- Protegido: requer autenticação

#### `POST /settings/delete/`
- Deletar conta do usuário logado
- Lógica:
  1. Fazer logout
  2. Deletar usuário (cascata deleta assets automaticamente)
  3. Renderizar página de confirmação
- Protegido: requer autenticação

### 2.3 Portfolio (`/`)

#### `GET /`
- Home: exibir portfolio do usuário logado
- Se não autenticado: redirecionar para `/accounts/login/`
- Lógica:
  ```python
  assets = list(user.assets.all())
  assets.sort(key=lambda a: a.quantity * a.current_price, reverse=True)
  labels = [asset.ticker for asset in assets]
  values = [asset.quantity * asset.current_price for asset in assets]
  ```
- Retornar JSON com `{ labels, values }`

### 2.4 Gerenciador de Ativos (`/manager/*`)

#### `GET /manager/`
- Listar todos os assets do usuário logado com métricas calculadas
- Protegido: requer autenticação
- Cálculos por asset:
  ```python
  percent_change = ((current_price - average_price) / average_price) * 100
  total_invested = quantity * average_price
  current_value = quantity * current_price
  result = current_value - total_invested
  ```
- Retornar array de objetos:
  ```json
  [
    {
      "id": 1,
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

#### `POST /manager/create/`
- Criar novo asset
- Body: `{ ticker, quantity, average_price, current_price }`
- Associar ao usuário logado
- Ticker convertido para UPPERCASE
- Protegido: requer autenticação

#### `GET /manager/edit/:id`
- Buscar asset por ID
- Validar ownership: `asset.user_id === logged_user.id`
- Retornar 404 se não encontrado ou não pertence ao usuário

#### `POST /manager/edit/:id`
- Atualizar asset
- Body: `{ ticker, quantity, average_price, current_price }`
- Validar ownership antes de salvar
- Ticker convertido para UPPERCASE
- Protegido: requer autenticação

#### `POST /manager/delete/:id`
- Deletar asset
- Validar ownership antes de deletar
- Protegido: requer autenticação

---

## 3. Regras de Segurança

### 3.1 Autenticação
- Todas as rotas exceto `/accounts/login/`, `/accounts/register/` e (opcionalmente) `GET /` devem exigir autenticação
- Implementar sessões ou JWT

### 3.2 Autorização
- **Ownership check obrigatório** em:
  - `GET /manager/edit/:id`
  - `POST /manager/edit/:id`
  - `POST /manager/delete/:id`
- Retornar 404 ou 403 se o asset não pertence ao usuário logado

### 3.3 Proteção CSRF
- Implementar tokens CSRF ou usar JWT com refresh tokens

### 3.4 Hash de Senha
- Usar bcrypt ou argon2 (equivalente ao hash Django)

---

## 4. Lógica de Negócio

### 4.1 Ticker em UPPERCASE
```javascript
// Antes de salvar asset
asset.ticker = asset.ticker.toUpperCase();
```

### 4.2 Métricas Calculadas (manager)
```javascript
const percent_change = asset.average_price !== 0 
  ? ((asset.current_price - asset.average_price) / asset.average_price) * 100 
  : null;

const total_invested = asset.quantity * asset.average_price;
const current_value = asset.quantity * asset.current_price;
const result = current_value - total_invested;
```

### 4.3 Ordenação do Portfolio
```javascript
// Ordenar assets por valor atual decrescente
assets.sort((a, b) => 
  (b.quantity * b.current_price) - (a.quantity * a.current_price)
);
```

---

## 5. Seed Inicial

### Script de Seed
```javascript
// Criar usuário de teste (get_or_create pattern)
const user = await User.findOrCreate({
  where: { username: "carlos@email.com" },
  defaults: {
    email: "carlos@email.com",
    password: await bcrypt.hash("123456", 10)
  }
});

// Deletar assets existentes deste usuário
await Asset.destroy({ where: { user_id: user.id } });

// Criar assets
const assets = [
  { ticker: "PETR4", quantity: 100, average_price: 31.24, current_price: 31.79 },
  { ticker: "VALE3", quantity: 50, average_price: 53.45, current_price: 67.40 },
  { ticker: "ITUB4", quantity: 200, average_price: 37.49, current_price: 41.64 },
  { ticker: "BBDC4", quantity: 150, average_price: 16.08, current_price: 19.65 },
  { ticker: "COCA34", quantity: 120, average_price: 67.29, current_price: 64.77 },
  { ticker: "AFHI11", quantity: 80, average_price: 92.40, current_price: 94.67 },
  { ticker: "SNAG11", quantity: 600, average_price: 9.67, current_price: 10.17 }
];

await Asset.bulkCreate(
  assets.map(a => ({ ...a, user_id: user.id }))
);

console.log("Seeding completed successfully!");
```

---

## 6. Banco de Dados

### 6.1 PostgreSQL (produção)
- Conexão via variável de ambiente `DATABASE_URL`
- Exemplo: `postgresql://user:pass@host:5432/dbname`

### 6.2 SQLite (desenvolvimento local)
- Usar SQLite para desenvolvimento rápido
- Configurar via ambiente ou arquivo separado

---

## 7. Configurações e Variáveis de Ambiente

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=seu-secret-key-aqui
DEBUG=true
NODE_ENV=development
PORT=8000
```

### 7.1 Locale e Timezone
- Locale: `pt-BR`
- Timezone: `America/Sao_Paulo`
- Formatar datas e valores monetários conforme pt-BR

---

## 8. Estrutura de Resposta

### 8.1 Portfolio (GET /)
```json
{
  "labels": ["PETR4", "VALE3", "ITUB4"],
  "values": [3179.0, 3370.0, 8328.0]
}
```

### 8.2 Manager List (GET /manager/)
```json
[
  {
    "id": 1,
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

---

## 9. Handler 404

- Implementar handler customizado para rotas não encontradas
- Retornar JSON ou HTML com status 404

---

## 10. Validações de Formulário

### Register
- Email obrigatório e válido
- Password obrigatório (mínimo 6 caracteres)
- Email único (verificar antes de criar)

### Asset Create/Edit
- `ticker`: obrigatório, max 20 caracteres
- `quantity`: obrigatório, inteiro positivo
- `average_price`: obrigatório, float positivo
- `current_price`: opcional, float positivo

---

## Checklist de Implementação

- [ ] Setup Fastify + TypeScript/JavaScript
- [ ] Configurar ORM (Prisma/Sequelize/TypeORM)
- [ ] Criar modelos User e Asset
- [ ] Implementar autenticação (sessão ou JWT)
- [ ] Criar todas as rotas de `/accounts/*`
- [ ] Criar todas as rotas de `/manager/*`
- [ ] Criar rota home `/` com lógica de portfolio
- [ ] Implementar `/settings/*` (incluindo delete)
- [ ] Adicionar middleware de autenticação
- [ ] Validar ownership em rotas de asset
- [ ] Implementar seed script
- [ ] Testar todas as rotas
- [ ] Configurar CORS (se necessário para frontend)
- [ ] Deploy no Render ou plataforma similar

---

## Notas Finais

- Este projeto **não inclui frontend** (apenas API)
- Todas as respostas devem ser JSON (exceto onde indicado)
- Manter nomenclatura de rotas **idêntica** ao Django
- Priorizar segurança: validar inputs, proteger rotas, hash senhas
- Garantir que a deleção de usuário deletar assets em cascata (FK constraint ou lógica manual)
