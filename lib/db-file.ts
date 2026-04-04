import fs from "fs/promises";
import path from "path";

import type { Food } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "foods.json");

export async function readFoodsFile(): Promise<Food[]> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw) as Food[];
}

export async function writeFoodsFile(foods: Food[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(foods, null, 2), "utf-8");
}

export function nextFoodIdFromFoods(foods: Food[]): number {
  if (foods.length === 0) return 1;
  return Math.max(...foods.map((f) => f.id), 0) + 1;
}
