import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatNumber, formatPortion } from "./format";
import type { Food } from "./types";

type LoadedImage = { data: string; format: "PNG" | "JPEG" };

async function toDataUrl(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read error"));
      reader.readAsDataURL(blob);
    });
    return { data, format: blob.type.includes("png") ? "PNG" : "JPEG" };
  } catch {
    return null;
  }
}

export async function exportFoodsToPdf(foods: Food[]): Promise<void> {
  const doc = new jsPDF();
  const images = await Promise.all(
    foods.map((food) => (food.imageUrl ? toDataUrl(food.imageUrl) : Promise.resolve(null))),
  );

  doc.setFontSize(16);
  doc.text("Lista de Alimentos", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Data: ${new Date().toLocaleDateString("pt-PT")}   ·   ${foods.length} alimento(s)`,
    14,
    25,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 31,
    head: [["", "Alimento", "Categoria", "Supermercado", "Porção", "Calorias", "Ranking"]],
    body: foods.map((food) => [
      "",
      food.name,
      food.category,
      food.market,
      formatPortion(food.portionSize, food.portionType),
      `${formatNumber(food.calories)} kcal`,
      `${food.ranking}/5`,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, valign: "middle" },
    headStyles: { fillColor: [4, 120, 87] },
    columnStyles: { 0: { cellWidth: 16, minCellHeight: 16 } },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 0) return;
      const image = images[data.row.index];
      if (!image) return;
      try {
        doc.addImage(image.data, image.format, data.cell.x + 1, data.cell.y + 1, 14, 14);
      } catch {
        /* ignore broken image */
      }
    },
  });

  doc.save(`alimentos-${new Date().toISOString().slice(0, 10)}.pdf`);
}
