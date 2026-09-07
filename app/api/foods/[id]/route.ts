import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { deleteFood, updateFood } from "@/lib/db";
import { parseFoodInput } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: Request, context: Context) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseFoodInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const food = await updateFood(id, parsed.value);
    if (!food) {
      return NextResponse.json({ error: "Food not found." }, { status: 404 });
    }
    return NextResponse.json(food);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update food." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  try {
    const removed = await deleteFood(id);
    if (!removed) {
      return NextResponse.json({ error: "Food not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete food." }, { status: 500 });
  }
}
