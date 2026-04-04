import {
  deleteFoodNeon,
  insertFoodNeon,
  nextFoodIdNeon,
  readFoodsNeon,
  writeFoodsNeon,
} from "./db-neon";
import { nextFoodIdFromFoods, readFoodsFile, writeFoodsFile } from "./db-file";
import type { Food } from "./types";

function hasRemoteDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function readFoods(): Promise<Food[]> {
  if (hasRemoteDatabase()) {
    return readFoodsNeon();
  }
  return readFoodsFile();
}

export async function writeFoods(foods: Food[]): Promise<void> {
  if (hasRemoteDatabase()) {
    return writeFoodsNeon(foods);
  }
  return writeFoodsFile(foods);
}

/** Próximo ID: usa a BD se `DATABASE_URL` estiver definido, senão o ficheiro JSON. */
export async function nextFoodId(foods: Food[]): Promise<number> {
  if (hasRemoteDatabase()) {
    return nextFoodIdNeon();
  }
  return nextFoodIdFromFoods(foods);
}

export async function insertFood(food: Food): Promise<void> {
  if (hasRemoteDatabase()) {
    return insertFoodNeon(food);
  }
  const foods = await readFoodsFile();
  foods.push(food);
  return writeFoodsFile(foods);
}

export async function deleteFoodById(id: number): Promise<boolean> {
  if (hasRemoteDatabase()) {
    return deleteFoodNeon(id);
  }
  const foods = await readFoodsFile();
  const next = foods.filter((f) => f.id !== id);
  if (next.length === foods.length) return false;
  await writeFoodsFile(next);
  return true;
}
