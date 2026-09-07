import type { Food, FoodInput } from "./types";

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (typeof body.error === "string") return body.error;
  } catch {
    /* fall through */
  }
  return `Erro ${res.status}`;
}

export async function fetchFoods(): Promise<Food[]> {
  const res = await fetch("/api/foods", { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Food[];
}

export async function createFood(input: FoodInput): Promise<Food> {
  const res = await fetch("/api/foods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Food;
}

export async function updateFood(id: number, input: FoodInput): Promise<Food> {
  const res = await fetch(`/api/foods/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Food;
}

export async function deleteFood(id: number): Promise<void> {
  const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { url: string };
  return body.url;
}

export async function seedDatabase(): Promise<number> {
  const res = await fetch("/api/seed", { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { inserted: number };
  return body.inserted;
}
