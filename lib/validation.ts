import { MAX_RANKING, MIN_RANKING } from "./constants";
import type { FoodInput } from "./types";

export type ValidationResult =
  | { ok: true; value: FoodInput }
  | { ok: false; error: string };

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function parseFoodInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }
  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return { ok: false, error: "Name is required." };

  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  const market = typeof raw.market === "string" ? raw.market.trim() : "";
  const portionType =
    typeof raw.portionType === "string" && raw.portionType.trim() !== ""
      ? raw.portionType.trim()
      : "g";

  const portionSize = toNumber(raw.portionSize);
  if (portionSize === null || portionSize <= 0) {
    return { ok: false, error: "Portion size must be a positive number." };
  }

  const calories = toNumber(raw.calories);
  if (calories === null || calories < 0) {
    return { ok: false, error: "Calories must be zero or a positive number." };
  }

  const rankingNum = toNumber(raw.ranking);
  const ranking = rankingNum === null ? 3 : Math.round(rankingNum);
  if (ranking < MIN_RANKING || ranking > MAX_RANKING) {
    return { ok: false, error: `Ranking must be between ${MIN_RANKING} and ${MAX_RANKING}.` };
  }

  const imageUrl =
    typeof raw.imageUrl === "string" && raw.imageUrl.trim() !== ""
      ? raw.imageUrl.trim()
      : null;

  return {
    ok: true,
    value: { name, category, market, portionType, portionSize, calories, ranking, imageUrl },
  };
}
