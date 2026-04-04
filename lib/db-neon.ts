import { neon } from "@neondatabase/serverless";
import fs from "fs/promises";
import path from "path";

import type { Food } from "./types";

type Sql = ReturnType<typeof neon>;

let sqlInstance: Sql | null = null;
let initialized = false;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definido.");
  }
  if (!sqlInstance) {
    sqlInstance = neon(url);
  }
  return sqlInstance;
}

const DATA_PATH = path.join(process.cwd(), "data", "foods.json");

async function ensureInit(): Promise<void> {
  if (initialized) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      market TEXT NOT NULL,
      image TEXT NOT NULL
    )
  `;

  const countRows = (await sql`SELECT COUNT(*)::int AS c FROM foods`) as { c: number }[];
  const count = Number(countRows[0]?.c ?? 0);
  if (count === 0) {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const seed = JSON.parse(raw) as Food[];
    for (const f of seed) {
      await sql`
        INSERT INTO foods (id, name, category, market, image)
        VALUES (${f.id}, ${f.name}, ${f.category}, ${f.market}, ${f.image})
      `;
    }
  }

  initialized = true;
}

export async function readFoodsNeon(): Promise<Food[]> {
  await ensureInit();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, category, market, image FROM foods ORDER BY id
  `) as Food[];
  return rows;
}

export async function writeFoodsNeon(foods: Food[]): Promise<void> {
  await ensureInit();
  const sql = getSql();
  await sql`DELETE FROM foods`;
  for (const f of foods) {
    await sql`
      INSERT INTO foods (id, name, category, market, image)
      VALUES (${f.id}, ${f.name}, ${f.category}, ${f.market}, ${f.image})
    `;
  }
}

export async function insertFoodNeon(food: Food): Promise<void> {
  await ensureInit();
  const sql = getSql();
  await sql`
    INSERT INTO foods (id, name, category, market, image)
    VALUES (${food.id}, ${food.name}, ${food.category}, ${food.market}, ${food.image})
  `;
}

export async function deleteFoodNeon(id: number): Promise<boolean> {
  await ensureInit();
  const sql = getSql();
  const r = (await sql`DELETE FROM foods WHERE id = ${id} RETURNING id`) as { id: number }[];
  return r.length > 0;
}

export async function nextFoodIdNeon(): Promise<number> {
  await ensureInit();
  const sql = getSql();
  const r = (await sql`SELECT COALESCE(MAX(id), 0) AS m FROM foods`) as { m: number }[];
  return Number(r[0]?.m ?? 0) + 1;
}
