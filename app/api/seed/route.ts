import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { countFoods, createFood } from "@/lib/db";
import type { FoodInput } from "@/lib/types";

const SAMPLE_FOODS: FoodInput[] = [
  { name: "Banana", category: "Frutas e Legumes", market: "Continente", portionType: "unidade", portionSize: 1, calories: 89, ranking: 5, imageUrl: null },
  { name: "Leite meio-gordo", category: "Laticínios", market: "Pingo Doce", portionType: "ml", portionSize: 200, calories: 92, ranking: 4, imageUrl: null },
  { name: "Pão de forma integral", category: "Padaria", market: "Lidl", portionType: "fatia", portionSize: 1, calories: 65, ranking: 3, imageUrl: null },
  { name: "Peito de frango", category: "Carnes e Peixes", market: "Aldi", portionType: "g", portionSize: 100, calories: 165, ranking: 5, imageUrl: null },
  { name: "Arroz basmati cozido", category: "Cereais e Leguminosas", market: "Continente", portionType: "g", portionSize: 100, calories: 130, ranking: 4, imageUrl: null },
  { name: "Iogurte natural", category: "Laticínios", market: "Mercadona", portionType: "unidade", portionSize: 1, calories: 61, ranking: 4, imageUrl: null },
];

export async function POST() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  try {
    const existing = await countFoods();
    if (existing > 0) {
      return NextResponse.json({ inserted: 0, message: "Database already has foods." });
    }
    for (const food of SAMPLE_FOODS) {
      await createFood(food);
    }
    return NextResponse.json({ inserted: SAMPLE_FOODS.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to seed database." }, { status: 500 });
  }
}
