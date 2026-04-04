import { NextResponse } from "next/server";

import { writeFoods } from "@/lib/db";
import type { Food } from "@/lib/types";

function isFood(x: unknown): x is Food {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.name === "string" &&
    typeof o.category === "string" &&
    typeof o.market === "string" &&
    typeof o.image === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { foods?: unknown };
    const raw = body.foods;
    if (!Array.isArray(raw) || !raw.every(isFood)) {
      return NextResponse.json({ error: "Formato inválido. Esperado { foods: Food[] }." }, { status: 400 });
    }

    await writeFoods(raw);
    return NextResponse.json({ ok: true, count: raw.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao importar base de dados." }, { status: 500 });
  }
}
