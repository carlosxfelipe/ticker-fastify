import Database from "better-sqlite3";
import { hash } from "bcryptjs";
import { join } from "node:path";

const DB_PATH =
  process.env.SQLITE_DATABASE ?? join(process.cwd(), "data/app.db");

async function seed() {
  console.log("🌱 Starting seed...");
  console.log(`📁 Database: ${DB_PATH}`);

  const db = new Database(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");

  // Criar tabelas se não existirem
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      average_price REAL NOT NULL,
      current_price REAL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Criar usuário de teste (get_or_create pattern)
  const email = "carlos@email.com";
  const username = email;
  const password = "123456";

  const checkUser = db.prepare("SELECT id FROM users WHERE username = ?");
  let user = checkUser.get(username) as { id: number } | undefined;

  if (!user) {
    console.log(`👤 Criando usuário ${email}...`);
    const passwordHash = await hash(password, 10);
    const insertUser = db.prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
    );
    const result = insertUser.run(username, email, passwordHash);
    user = { id: result.lastInsertRowid as number };
    console.log(`✅ Usuário criado com ID ${user.id}`);
  } else {
    console.log(`✓ Usuário já existe com ID ${user.id}`);
  }

  // Deletar assets existentes deste usuário
  const deleteAssets = db.prepare("DELETE FROM assets WHERE user_id = ?");
  const deleted = deleteAssets.run(user.id);
  console.log(`🗑️  Deletados ${deleted.changes} assets antigos`);

  // Criar assets
  const assets = [
    {
      ticker: "PETR4",
      quantity: 100,
      average_price: 31.24,
      current_price: 31.79,
    },
    {
      ticker: "VALE3",
      quantity: 50,
      average_price: 53.45,
      current_price: 67.4,
    },
    {
      ticker: "ITUB4",
      quantity: 200,
      average_price: 37.49,
      current_price: 41.64,
    },
    {
      ticker: "BBDC4",
      quantity: 150,
      average_price: 16.08,
      current_price: 19.65,
    },
    {
      ticker: "COCA34",
      quantity: 120,
      average_price: 67.29,
      current_price: 64.77,
    },
    {
      ticker: "AFHI11",
      quantity: 80,
      average_price: 92.4,
      current_price: 94.67,
    },
    {
      ticker: "SNAG11",
      quantity: 600,
      average_price: 9.67,
      current_price: 10.17,
    },
  ];

  const insertAsset = db.prepare(
    "INSERT INTO assets (user_id, ticker, quantity, average_price, current_price) VALUES (?, ?, ?, ?, ?)"
  );

  console.log(`📊 Criando ${assets.length} assets...`);
  for (const asset of assets) {
    insertAsset.run(
      user.id,
      asset.ticker.toUpperCase(),
      asset.quantity,
      asset.average_price,
      asset.current_price
    );
    console.log(`  ✓ ${asset.ticker}`);
  }

  db.close();
  console.log("✅ Seeding completed successfully!");
  console.log(`\n📝 Credenciais de teste:`);
  console.log(`   Email: ${email}`);
  console.log(`   Senha: ${password}`);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
