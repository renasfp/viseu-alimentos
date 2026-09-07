"use client";

import { useEffect, useState } from "react";

import { CATEGORIES, MARKETS, PORTION_TYPES } from "@/lib/constants";
import { createFood, updateFood, uploadImage } from "@/lib/client";
import type { Food, FoodInput } from "@/lib/types";

import { StarRating } from "./StarRating";

type Props = {
  open: boolean;
  food: Food | null;
  onClose: () => void;
  onSaved: (food: Food) => void;
};

type FormState = {
  name: string;
  category: string;
  market: string;
  portionType: string;
  portionSize: string;
  calories: string;
  ranking: number;
  imageUrl: string | null;
};

function toFormState(food: Food | null): FormState {
  return {
    name: food?.name ?? "",
    category: food?.category ?? CATEGORIES[0],
    market: food?.market ?? MARKETS[0],
    portionType: food?.portionType ?? PORTION_TYPES[0],
    portionSize: food ? String(food.portionSize) : "100",
    calories: food ? String(food.calories) : "",
    ranking: food?.ranking ?? 3,
    imageUrl: food?.imageUrl ?? null,
  };
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export function FoodFormModal({ open, food, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toFormState(food));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(food));
      setError(null);
    }
  }, [open, food]);

  if (!open) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      set("imageUrl", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload da imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: FoodInput = {
      name: form.name.trim(),
      category: form.category,
      market: form.market,
      portionType: form.portionType,
      portionSize: Number(form.portionSize.replace(",", ".")),
      calories: Number(form.calories.replace(",", ".")),
      ranking: form.ranking,
      imageUrl: form.imageUrl,
    };

    try {
      const saved = food
        ? await updateFood(food.id, payload)
        : await createFood(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-emerald-900">
            {food ? "Editar alimento" : "Adicionar alimento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome *
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="market" className="block text-sm font-medium text-gray-700">
                Supermercado
              </label>
              <select
                id="market"
                value={form.market}
                onChange={(event) => set("market", event.target.value)}
                className={inputClass}
              >
                {MARKETS.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="portionSize" className="block text-sm font-medium text-gray-700">
                Tamanho porção *
              </label>
              <input
                id="portionSize"
                required
                inputMode="decimal"
                value={form.portionSize}
                onChange={(event) => set("portionSize", event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="portionType" className="block text-sm font-medium text-gray-700">
                Tipo porção
              </label>
              <select
                id="portionType"
                value={form.portionType}
                onChange={(event) => set("portionType", event.target.value)}
                className={inputClass}
              >
                {PORTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="calories" className="block text-sm font-medium text-gray-700">
                Calorias (kcal) *
              </label>
              <input
                id="calories"
                required
                inputMode="decimal"
                value={form.calories}
                onChange={(event) => set("calories", event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700">Ranking</span>
            <div className="mt-1">
              <StarRating value={form.ranking} onChange={(value) => set("ranking", value)} />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700">Imagem</span>
            <div className="mt-1 flex items-center gap-3">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover ring-1 ring-black/10"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                  Sem foto
                </div>
              )}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImage(file);
                  }}
                  className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700"
                />
                {uploading && <p className="text-xs text-gray-500">A carregar imagem…</p>}
                {form.imageUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => set("imageUrl", null)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remover imagem
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
