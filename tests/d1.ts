import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
export class LocalD1 {
  db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec(
      readFileSync(
        new URL("../schema/0001_platform.sql", import.meta.url),
        "utf8",
      ),
    );
  }
  prepare(sql: string) {
    return new Statement(this, sql, []);
  }
  async batch(queries: Statement[]) {
    this.db.exec("BEGIN");
    try {
      const out = [];
      for (const q of queries) out.push(await q.all());
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  async exec(sql: string) {
    this.db.exec(sql);
  }
}
class Statement {
  constructor(
    public parent: LocalD1,
    public sql: string,
    public args: any[],
  ) {}
  bind(...args: any[]) {
    return new Statement(this.parent, this.sql, args);
  }
  async all() {
    const statement = this.parent.db.prepare(this.sql);
    const results = statement.all(...this.args);
    const meta = this.parent.db
      .prepare("SELECT changes() changes, last_insert_rowid() last_row_id")
      .get();
    return { success: true, results, meta };
  }
  async first(column?: string) {
    const result = this.parent.db.prepare(this.sql).get(...this.args);
    return result ? (column ? result[column] : result) : null;
  }
  async run() {
    return this.all();
  }
}
export class LocalR2 {
  objects = new Map<string, Uint8Array>();
  async put(key: string, data: Uint8Array | ArrayBuffer) {
    this.objects.set(key, new Uint8Array(data));
  }
  async get(key: string) {
    const data = this.objects.get(key);
    return data ? { body: new Response(data).body } : null;
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}
