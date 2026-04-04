"use client";

import { jsPDF } from "jspdf";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CATEGORIES, MARKETS } from "@/lib/constants";
import type { Food } from "@/lib/types";

function resolveImageUrlForPdf(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window === "undefined") return url;
  const path = url.startsWith("/") ? url : `/${url.replace(/^\/+/, "")}`;
  return `${window.location.origin}${path}`;
}

function resolveImageInput(raw: string, foodName: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const path = t.startsWith("images/") ? t : `images/${t.replace(/^\/+/, "")}`;
  return path.startsWith("/") ? path : `/${path}`;
}

function loadImageAsDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const resolved = resolveImageUrlForPdf(url);

    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unsupported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = function () {
      reject(new Error("Falha ao carregar imagem"));
    };

    if (resolved.startsWith("http") && !resolved.includes("via.placeholder")) {
      img.src = `${resolved}${resolved.includes("?") ? "&" : "?"}nocache=${Date.now()}`;
    } else {
      img.src = resolved;
    }
  });
}

export function FoodDatabase() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteMode, setDeleteMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/foods");
    if (!res.ok) {
      setLoadError("Não foi possível carregar a base de dados.");
      return;
    }
    const data = (await res.json()) as Food[];
    setFoods(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const filteredFoods = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return foods.filter((food) => {
      const matchCategory = !categoryFilter || food.category === categoryFilter;
      const matchMarket = !marketFilter || food.market === marketFilter;
      const matchSearch = !q || food.name.toLowerCase().includes(q);
      return matchCategory && matchMarket && matchSearch;
    });
  }, [foods, categoryFilter, marketFilter, searchTerm]);

  const toggleSelection = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredFoods.forEach((f) => next.add(f.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const exportToPDF = async () => {
    if (selected.size === 0) {
      alert("Por favor, selecione pelo menos um alimento para exportar.");
      return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Lista de Alimentos Selecionados", 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Supermercados de Viseu", 20, 28);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-PT")}`, 20, 34);

    let yPosition = 50;
    const selectedList = foods.filter((food) => selected.has(food.id));

    for (let index = 0; index < selectedList.length; index++) {
      const food = selectedList[index];

      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      try {
        const imgData = await loadImageAsDataURL(food.image);
        doc.addImage(imgData, "JPEG", 20, yPosition, 30, 30);
      } catch {
        /* skip image row */
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${food.name}`, 55, yPosition + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Categoria: ${food.category}`, 55, yPosition + 16);
      doc.text(`Supermercado: ${food.market}`, 55, yPosition + 22);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition + 34, 190, yPosition + 34);

      yPosition += 40;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, 20, 290);
      doc.text(`Total de alimentos: ${selected.size}`, 160, 290);
    }

    doc.save(`alimentos-viseu-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const deleteFood = async (id: number) => {
    if (!confirm("Tem a certeza que deseja eliminar este alimento da base de dados?")) return;
    const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Não foi possível eliminar.");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await refresh();
  };

  const toggleDeleteMode = () => setDeleteMode((v) => !v);

  const exportDatabase = () => {
    const dataStr = JSON.stringify(foods, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `base-dados-alimentos-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (!Array.isArray(parsed)) {
          alert("Formato de ficheiro inválido.");
          return;
        }
        const res = await fetch("/api/foods/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foods: parsed }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(typeof err.error === "string" ? err.error : "Erro ao importar.");
          return;
        }
        await refresh();
        setSelected(new Set());
        alert("Base de dados importada com sucesso!");
      } catch (err) {
        alert(`Erro ao importar ficheiro: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  async function handleAddFood(formData: FormData) {
    const name = String(formData.get("foodName") ?? "").trim();
    const category = String(formData.get("foodCategory") ?? "");
    const market = String(formData.get("foodMarket") ?? "");
    const imageRaw = String(formData.get("foodImage") ?? "");

    const resolved = resolveImageInput(imageRaw, name);
    const body: Record<string, string | undefined> = { name, category, market };
    if (resolved) body.image = resolved;

    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(typeof err.error === "string" ? err.error : "Não foi possível adicionar.");
      return;
    }

    addFormRef.current?.reset();
    setModalOpen(false);
    await refresh();
  }

  const tableClassName = deleteMode ? "food-table delete-mode-active" : "food-table";

  return (
    <>
      <header>
        <h1>🛒 Base de Dados de Alimentos</h1>
        <p className="subtitle">Supermercados de Viseu - Portugal | Next.js</p>
      </header>

      <div className="controls">
        <div className="filter-group">
          <label htmlFor="categoryFilter">Categoria</label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas as Categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="marketFilter">Supermercado</label>
          <select
            id="marketFilter"
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
          >
            <option value="">Todos os Supermercados</option>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="searchInput">Pesquisar</label>
          <input
            type="text"
            id="searchInput"
            placeholder="Nome do alimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">Total de alimentos:</span>
          <span className="stat-value">{filteredFoods.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Selecionados:</span>
          <span className="stat-value">{selected.size}</span>
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-secondary" onClick={selectAll}>
            ✓ Selecionar Todos
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearSelection}>
            ✗ Limpar Seleção
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void exportToPDF()}>
            📥 Exportar PDF
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(true)}>
            ➕ Adicionar Alimento
          </button>
          <button
            type="button"
            className={deleteMode ? "btn btn-secondary" : "btn btn-danger"}
            onClick={toggleDeleteMode}
          >
            {deleteMode ? "✓ Sair do Modo Eliminar" : "🗑️ Modo Eliminar"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={exportDatabase}>
            💾 Exportar JSON
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => importRef.current?.click()}
          >
            📂 Importar JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={importDatabase}
            aria-hidden
          />
        </div>
      </div>

      {loading && <p className="subtitle">A carregar…</p>}
      {loadError && (
        <p role="alert" style={{ color: "#c0152f" }}>
          {loadError}
        </p>
      )}

      <div className={tableClassName} id="foodTableContainer">
        <table>
          <thead>
            <tr>
              <th>✓</th>
              <th>Imagem</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Supermercado</th>
              <th style={{ display: deleteMode ? "table-cell" : "none" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              filteredFoods.map((food) => (
                <tr
                  key={food.id}
                  className={selected.has(food.id) ? "selected" : undefined}
                  data-id={food.id}
                >
                  <td className="table-checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(food.id)}
                      onChange={() => toggleSelection(food.id)}
                      aria-label={`Selecionar ${food.name}`}
                    />
                  </td>
                  <td>
                    <img
                      src={food.image}
                      alt={food.name}
                      className="table-image"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.src = `https://via.placeholder.com/120x120/21808d/ffffff?text=${encodeURIComponent(food.name)}`;
                      }}
                    />
                  </td>
                  <td>
                    <strong>{food.name}</strong>
                  </td>
                  <td>{food.category}</td>
                  <td>{food.market}</td>
                  <td style={{ display: deleteMode ? "table-cell" : "none" }}>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => void deleteFood(food.id)}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredFoods.length === 0 && (
        <div className="empty-state" id="emptyState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
          </svg>
          <h3>Nenhum alimento encontrado</h3>
          <p>Tente ajustar os filtros ou adicione novos alimentos à base de dados.</p>
        </div>
      )}

      <div
        id="addModal"
        className={modalOpen ? "modal active" : "modal"}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
        role="presentation"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Adicionar Alimento</h2>
            <button type="button" className="close-btn" onClick={() => setModalOpen(false)}>
              &times;
            </button>
          </div>
          <form
            ref={addFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddFood(new FormData(e.currentTarget));
            }}
          >
            <div className="form-group">
              <label htmlFor="foodName">Nome do Alimento *</label>
              <input type="text" id="foodName" name="foodName" required />
            </div>
            <div className="form-group">
              <label htmlFor="foodCategory">Categoria *</label>
              <select id="foodCategory" name="foodCategory" required defaultValue="">
                <option value="" disabled>
                  Selecione...
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="foodMarket">Supermercado *</label>
              <select id="foodMarket" name="foodMarket" required defaultValue="">
                <option value="" disabled>
                  Selecione...
                </option>
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="foodImage">URL da Imagem (opcional)</label>
              <input
                type="text"
                id="foodImage"
                name="foodImage"
                placeholder="https://... ou banana.jpg"
              />
              <small className="form-hint">
                💡 Dica: Coloque imagens na pasta <strong>public/images/</strong> (ex:{" "}
                <code>banana.jpg</code> → <code>/images/banana.jpg</code>)
              </small>
              <small className="form-hint">
                📂 Use caminhos como <code>/images/banana.jpg</code> para ficheiros locais.
              </small>
            </div>
            <div className="btn-group">
              <button type="submit" className="btn btn-primary">
                Adicionar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
