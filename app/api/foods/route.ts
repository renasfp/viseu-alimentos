import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createFood, listFoods } from "@/lib/db";
import { parseFoodInput } from "@/lib/validation";

export async function GET() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  try {
    const foods = await listFoods();
    return NextResponse.json(foods);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load foods." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

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
    const food = await createFood(parsed.value);
    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create food." }, { status: 500 });
  }
}
