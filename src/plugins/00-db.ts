import fp from "fastify-plugin";
import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_DB_FILENAME = "data/app.db";

export type Db = Database.Database;

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

const dbPlugin = fp(async (fastify) => {
  const file = process.env.SQLITE_DATABASE ?? DEFAULT_DB_FILENAME;
  const databasePath = file === ":memory:" ? file : join(process.cwd(), file);

  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);

  db.exec(`PRAGMA foreign_keys = ON;`);

  // Tabela users com autoincrement
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

  // Tabela assets com autoincrement e FK para users
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

  fastify.decorate("db", db);

  fastify.addHook("onClose", (instance, done) => {
    instance.db.close();
    done();
  });

  fastify.log.info(`Database initialized at ${databasePath}`);
});

export default dbPlugin;
