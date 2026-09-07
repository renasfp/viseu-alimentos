"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CATEGORIES, MARKETS } from "@/lib/constants";
import {
  deleteFood as deleteFoodRequest,
  fetchFoods,
  seedDatabase,
} from "@/lib/client";
import { formatNumber, formatPortion } from "@/lib/format";
import { exportFoodsToPdf } from "@/lib/pdf";
import type { Food } from "@/lib/types";

import { FoodFormModal } from "./FoodFormModal";
import { StarRating } from "./StarRating";

export function FoodManager() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [minRanking, setMinRanking] = useState(0);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFoods(await fetchFoods());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return foods.filter((food) => {
      if (query && !food.name.toLowerCase().includes(query)) return false;
      if (categoryFilter && food.category !== categoryFilter) return false;
      if (marketFilter && food.market !== marketFilter) return false;
      if (minRanking && food.ranking < minRanking) return false;
      return true;
    });
  }, [foods, search, categoryFilter, marketFilter, minRanking]);

  const selectedFoods = useMemo(
    () => foods.filter((food) => selected.has(food.id)),
    [foods, selected],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((food) => selected.has(food.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((food) => next.delete(food.id));
      } else {
        filtered.forEach((food) => next.add(food.id));
      }
      return next;
    });
  }

  function handleSaved(saved: Food) {
    setFoods((prev) => {
      const exists = prev.some((food) => food.id === saved.id);
      const next = exists
        ? prev.map((food) => (food.id === saved.id ? saved : food))
        : [...prev, saved];
      return next.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    });
  }

  async function handleDelete(food: Food) {
    if (!confirm(`Eliminar "${food.name}" da base de dados?`)) return;
    setBusy(true);
    try {
      await deleteFoodRequest(food.id);
      setFoods((prev) => prev.filter((item) => item.id !== food.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(food.id);
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível eliminar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (selectedFoods.length === 0) return;
    setExporting(true);
    try {
      await exportFoodsToPdf(selectedFoods);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function handleSeed() {
    setBusy(true);
    try {
      await seedDatabase();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao criar exemplos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="search" className="block text-xs font-medium text-gray-500">
            Pesquisar
          </label>
          <input
            id="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome do alimento…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-xs font-medium text-gray-500">
            Categoria
          </label>
          <select
            id="category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Todas</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="market" className="block text-xs font-medium text-gray-500">
            Supermercado
          </label>
          <select
            id="market"
            value={marketFilter}
            onChange={(event) => setMarketFilter(event.target.value)}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Todos</option>
            {MARKETS.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ranking" className="block text-xs font-medium text-gray-500">
            Ranking mín.
          </label>
          <select
            id="ranking"
            value={minRanking}
            onChange={(event) => setMinRanking(Number(event.target.value))}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value={0}>Qualquer</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}+ ★
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Adicionar alimento
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-600">
          {filtered.length} de {foods.length} alimentos
        </span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-600">{selected.size} selecionados</span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-emerald-700 hover:underline"
          >
            Limpar seleção
          </button>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={selected.size === 0 || exporting}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {exporting ? "A gerar PDF…" : `Exportar PDF (${selected.size})`}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="px-4 py-3">Imagem</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Supermercado</th>
              <th className="px-4 py-3">Porção</th>
              <th className="px-4 py-3">Calorias</th>
              <th className="px-4 py-3">Ranking</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  A carregar…
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  {foods.length === 0 ? (
                    <span>
                      Sem alimentos.{" "}
                      <button
                        type="button"
                        onClick={handleSeed}
                        disabled={busy}
                        className="text-emerald-700 hover:underline"
                      >
                        Criar exemplos
                      </button>
                    </span>
                  ) : (
                    "Nenhum alimento corresponde aos filtros."
                  )}
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((food) => (
                <tr
                  key={food.id}
                  className={selected.has(food.id) ? "bg-emerald-50/60" : undefined}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(food.id)}
                      onChange={() => toggle(food.id)}
                      aria-label={`Selecionar ${food.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {food.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={food.imageUrl}
                        alt={food.name}
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-black/10"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                        s/ foto
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{food.name}</td>
                  <td className="px-4 py-3 text-gray-600">{food.category}</td>
                  <td className="px-4 py-3 text-gray-600">{food.market}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatPortion(food.portionSize, food.portionType)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(food.calories)} kcal
                  </td>
                  <td className="px-4 py-3">
                    <StarRating value={food.ranking} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(food);
                        setModalOpen(true);
                      }}
                      className="text-emerald-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(food)}
                      disabled={busy}
                      className="ml-3 text-red-600 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <FoodFormModal
        open={modalOpen}
        food={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
