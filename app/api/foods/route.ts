import { NextResponse } from "next/server";

import { readFoods, writeFoods, nextFoodId } from "@/lib/db";
import type { Food } from "@/lib/types";

export async function GET() {
  try {
    const foods = await readFoods();
    return NextResponse.json(foods);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao ler a base de dados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Food>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const market = typeof body.market === "string" ? body.market.trim() : "";
    const image =
      typeof body.image === "string" && body.image.trim() !== "" ? body.image.trim() : undefined;

    if (!name || !category || !market) {
      return NextResponse.json({ error: "Nome, categoria e supermercado são obrigatórios." }, { status: 400 });
    }

    const foods = await readFoods();
    const newFood: Food = {
      id: nextFoodId(foods),
      name,
      category,
      market,
      image:
        image ??
        `https://via.placeholder.com/400x300/21808d/ffffff?text=${encodeURIComponent(name)}`,
    };

    foods.push(newFood);
    await writeFoods(foods);

    return NextResponse.json(newFood, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao adicionar alimento." }, { status: 500 });
  }
}
