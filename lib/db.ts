import { neon } from "@neondatabase/serverless";

import type { Food, FoodInput } from "./types";

type Sql = ReturnType<typeof neon>;

let sqlInstance: Sql | null = null;
let schemaReady: Promise<void> | null = null;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!sqlInstance) {
    sqlInstance = neon(url);
  }
  return sqlInstance;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS foods (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT '',
          market TEXT NOT NULL DEFAULT '',
          portion_type TEXT NOT NULL DEFAULT 'g',
          portion_size NUMERIC NOT NULL DEFAULT 100,
          calories NUMERIC NOT NULL DEFAULT 0,
          ranking INTEGER NOT NULL DEFAULT 3,
          image_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      // Columns used by the bulk import script (scripts/import-pingo-doce.mjs).
      await sql`ALTER TABLE foods ADD COLUMN IF NOT EXISTS barcode TEXT`;
      await sql`ALTER TABLE foods ADD COLUMN IF NOT EXISTS source TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS foods_barcode_key ON foods (barcode) WHERE barcode IS NOT NULL`;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

type FoodRow = {
  id: number;
  name: string;
  category: string;
  market: string;
  portion_type: string;
  portion_size: string | number;
  calories: string | number;
  ranking: number;
  image_url: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapRow(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    market: row.market,
    portionType: row.portion_type,
    portionSize: Number(row.portion_size),
    calories: Number(row.calories),
    ranking: Number(row.ranking),
    imageUrl: row.image_url,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listFoods(): Promise<Food[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM foods ORDER BY name ASC
  `) as FoodRow[];
  return rows.map(mapRow);
}

export async function createFood(input: FoodInput): Promise<Food> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO foods (name, category, market, portion_type, portion_size, calories, ranking, image_url)
    VALUES (
      ${input.name}, ${input.category}, ${input.market}, ${input.portionType},
      ${input.portionSize}, ${input.calories}, ${input.ranking}, ${input.imageUrl}
    )
    RETURNING *
  `) as FoodRow[];
  return mapRow(rows[0]);
}

export async function updateFood(id: number, input: FoodInput): Promise<Food | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    UPDATE foods SET
      name = ${input.name},
      category = ${input.category},
      market = ${input.market},
      portion_type = ${input.portionType},
      portion_size = ${input.portionSize},
      calories = ${input.calories},
      ranking = ${input.ranking},
      image_url = ${input.imageUrl},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as FoodRow[];
  return rows.length ? mapRow(rows[0]) : null;
}

export async function deleteFood(id: number): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`DELETE FROM foods WHERE id = ${id} RETURNING id`) as { id: number }[];
  return rows.length > 0;
}

export async function countFoods(): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT COUNT(*)::int AS c FROM foods`) as { c: number }[];
  return Number(rows[0]?.c ?? 0);
}
