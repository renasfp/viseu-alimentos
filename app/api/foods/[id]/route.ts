import { NextResponse } from "next/server";

import { readFoods, writeFoods } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const foods = await readFoods();
    const next = foods.filter((f) => f.id !== id);
    if (next.length === foods.length) {
      return NextResponse.json({ error: "Alimento não encontrado." }, { status: 404 });
    }

    await writeFoods(next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao eliminar alimento." }, { status: 500 });
  }
}
