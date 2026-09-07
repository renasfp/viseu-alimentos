/**
 * Bulk import of Pingo Doce products from Open Food Facts into the Neon database.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-pingo-doce.mjs
 *   node --env-file=.env.local scripts/import-pingo-doce.mjs --update   # also refresh existing rows
 *   node --env-file=.env.local scripts/import-pingo-doce.mjs --limit=200 # stop after N products (testing)
 *
 * Data source: Open Food Facts (Open Database License), via the search-a-licious
 * endpoint at https://search.openfoodfacts.org/search.
 * Images are referenced by URL (not copied), pointing at images.openfoodfacts.org.
 * Re-runnable: rows are matched by `barcode`, so existing products are skipped
 * (or refreshed with --update).
 */

import { neon } from "@neondatabase/serverless";

const MARKET = "Pingo Doce";
const SOURCE = "openfoodfacts";
const PAGE_SIZE = 100;
const THROTTLE_MS = 1000;
const MAX_RETRIES = 5;
const USER_AGENT = "ViseuAlimentos/1.0 (nutrition database import; contact renasfp@gmail.com)";

const FIELDS = [
  "code",
  "product_name",
  "product_name_pt",
  "product_name_en",
  "brands",
  "categories_tags",
  "image_front_url",
  "nutriments",
  "quantity",
  "serving_size",
  "nutriscore_grade",
].join(",");

const args = process.argv.slice(2);
const FORCE_UPDATE = args.includes("--update");
const LIMIT = Number(
  (args.find((a) => a.startsWith("--limit=")) ?? "").split("=")[1] || 0,
);

const PORTION_TYPES = new Set([
  "g",
  "ml",
  "unidade",
  "fatia",
  "chávena",
  "colher de sopa",
  "colher de chá",
  "pão",
  "embalagem",
]);

// Generic umbrella tags that carry no useful signal (and would false-match, e.g.
// "plant-based-foods-and-beverages" matching the drinks rule).
const GENERIC_TAGS = new Set([
  "en:plant-based-foods-and-beverages",
  "en:plant-based-foods",
  "en:foods",
  "en:groceries",
  "en:dietary-products",
]);

// Ordered: the first matching rule wins, so specific categories come before Bebidas.
const CATEGORY_RULES = [
  [/frozen|congelad/, "Congelados"],
  [
    /meat|poultry|beef|\bpork\b|chicken|frango|\bcarne|fish|seafood|peixe|marisc|\bham\b|fiambre|salsich|enchidos|charcut|presunto|chouri|bacon|atum|salmão|salmao|bacalhau/,
    "Carnes e Peixes",
  ],
  [
    /dairy|milk|iogurt|yogurt|yoghurt|kefir|cheese|queijo|natas|\bcream\b|leite|requeij|manteiga-com|butter-with/,
    "Laticínios",
  ],
  [
    /bread|bakery|padaria|pastr|viennoiser|croissant|\bbolo\b|\bpão|\bpao\b|broa|baguet|tostas?|torrada/,
    "Padaria",
  ],
  [
    /cereal|breakfast|pasta|pastas-and-dumplings|dumpling|gnocchi|\bmassa|\brice\b|arroz|noodle|legumes-and|pulses|\bbeans\b|feij[aã]o|gr[aã]o-de|lentil|lentilha|\bflour\b|farinha|aveia|\boat|quinoa|couscous|bulgur/,
    "Cereais e Leguminosas",
  ],
  [
    /:beverages\b|:drinks\b|:waters\b|:sodas\b|:juices\b|\bdrink\b|bottled-water|\bwater\b|águas?\b|refrigerante|\bjuice\b|\bsumo\b|coffee|\bcafé|\btea\b|\bchá\b|\bbeer\b|cerveja|\bwine\b|\bvinho\b|nectar|smoothie|kombucha/,
    "Bebidas",
  ],
  [
    /snack|chips|crisps|batata-frita|biscuit|bolacha|cookie|wafer|bolacha|chocolate|\bcandy\b|gomas|rebu[çc]ados|\bbar\b|barra|pipoca|popcorn|amendoim|peanut|frutos-secos|\bnuts\b/,
    "Snacks",
  ],
  [
    /fruit|fruta|vegetable|legume|hortícola|horticola|\bsalad|salada|fresh-vegetables|fresh-fruits|tomate|alface|cenoura|ma[çc][ãa]s?\b|banana/,
    "Frutas e Legumes",
  ],
];

function nutriScoreToRanking(grade) {
  switch (String(grade || "").toLowerCase()) {
    case "a":
      return 5;
    case "b":
      return 4;
    case "c":
      return 3;
    case "d":
      return 2;
    case "e":
      return 1;
    default:
      return 3;
  }
}

function pickName(product) {
  const candidates = [
    product.product_name_pt,
    product.product_name,
    product.product_name_en,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 1) return c.trim().slice(0, 200);
  }
  return null;
}

function mapCategory(product) {
  const tags = (Array.isArray(product.categories_tags) ? product.categories_tags : []).filter(
    (tag) => !GENERIC_TAGS.has(tag),
  );
  const haystack = [tags.join(" "), product.product_name ?? "", product.product_name_pt ?? ""]
    .join(" ")
    .toLowerCase();

  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(haystack)) return category;
  }
  return "Mercearia";
}

/** Parse an Open Food Facts serving_size / quantity string into { size, type }. */
function parsePortion(serving, quantity) {
  const text = String(serving || "").toLowerCase();

  if (/\b(unidade|unidad|unit|porç|porc|dose|fatia|slice|copo|cup|chávena|chavena)\b/.test(text)) {
    if (/fatia|slice/.test(text)) return { size: 1, type: "fatia" };
    if (/chávena|chavena|cup/.test(text)) return { size: 1, type: "chávena" };
    const weight = text.match(/([\d]+[.,]?[\d]*)\s*(g|gr|ml|cl|l|kg)\b/);
    if (weight) return normalizeWeight(weight);
    return { size: 1, type: "unidade" };
  }

  const weight =
    text.match(/([\d]+[.,]?[\d]*)\s*(g|gr|ml|cl|l|kg)\b/) ||
    String(quantity || "")
      .toLowerCase()
      .match(/([\d]+[.,]?[\d]*)\s*(g|gr|ml|cl|l|kg)\b/);
  if (weight) return normalizeWeight(weight);

  return { size: 100, type: "g" };
}

function normalizeWeight(match) {
  const value = Number(match[1].replace(",", "."));
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return { size: 100, type: "g" };
  switch (unit) {
    case "kg":
      return { size: value * 1000, type: "g" };
    case "l":
      return { size: value * 1000, type: "ml" };
    case "cl":
      return { size: value * 10, type: "ml" };
    case "ml":
      return { size: value, type: "ml" };
    default:
      return { size: value, type: "g" };
  }
}

/** Returns { portionType, portionSize, calories } for a product. */
function resolveNutrition(product) {
  const n = product.nutriments || {};
  const kcalServing = Number(n["energy-kcal_serving"]);
  const kcal100 = Number(n["energy-kcal_100g"]);

  if (Number.isFinite(kcalServing) && kcalServing > 0) {
    const portion = parsePortion(product.serving_size, product.quantity);
    return {
      portionType: PORTION_TYPES.has(portion.type) ? portion.type : "g",
      portionSize: round(portion.size),
      calories: Math.round(kcalServing),
    };
  }

  if (Number.isFinite(kcal100) && kcal100 > 0) {
    // No per-serving data: normalise everything to per 100 g/ml.
    const isLiquid = /\bml\b|\bl\b|\bcl\b/.test(String(product.quantity || "").toLowerCase());
    return {
      portionType: isLiquid ? "ml" : "g",
      portionSize: 100,
      calories: Math.round(kcal100),
    };
  }

  const portion = parsePortion(product.serving_size, product.quantity);
  return {
    portionType: PORTION_TYPES.has(portion.type) ? portion.type : "g",
    portionSize: round(portion.size),
    calories: 0,
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches one page from the Open Food Facts "search-a-licious" endpoint, which is
 * far more reliable than the legacy /api/v2/search under load.
 * Returns { products: [...], pageCount } or null if the page could not be fetched.
 */
async function fetchPage(page) {
  const url =
    `https://search.openfoodfacts.org/search` +
    `?q=${encodeURIComponent('stores:"Pingo Doce"')}` +
    `&fields=${FIELDS}&page_size=${PAGE_SIZE}&page=${page}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body.hits)) {
          return { products: body.hits, pageCount: Number(body.page_count) || 1 };
        }
        throw new Error("unexpected response shape");
      }
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.warn(`  page ${page}: giving up (${err.message}) — skipping this page`);
        return null;
      }
    }
    const backoff = THROTTLE_MS * 2 ** attempt;
    console.log(`  page ${page}: retry ${attempt}/${MAX_RETRIES - 1} in ${backoff}ms`);
    await sleep(backoff);
  }
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local " + process.argv[1]);
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS foods (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      market TEXT NOT NULL DEFAULT '',
      portion_type TEXT NOT NULL DEFAULT 'g',
      portion_size NUMERIC NOT NULL DEFAULT 100,
      calories NUMERIC NOT NULL DEFAULT 0,
      ranking INTEGER NOT NULL DEFAULT 3,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE foods ADD COLUMN IF NOT EXISTS barcode TEXT`;
  await sql`ALTER TABLE foods ADD COLUMN IF NOT EXISTS source TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS foods_barcode_key ON foods (barcode) WHERE barcode IS NOT NULL`;

  const seen = new Set();
  let page = 1;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;

  console.log(`Importing "${MARKET}" products from Open Food Facts…`);
  if (FORCE_UPDATE) console.log("Mode: --update (existing rows will be refreshed)");

  let failedPages = 0;

  while (true) {
    const body = await fetchPage(page);
    if (!body) {
      failedPages += 1;
      if (failedPages > 5) {
        console.warn("Too many failed pages, stopping early.");
        break;
      }
      page += 1;
      await sleep(THROTTLE_MS);
      continue;
    }
    const products = body.products;
    const pageCount = body.pageCount;
    if (products.length === 0) break;

    for (const product of products) {
      const barcode = String(product.code || "").trim();
      if (!barcode || seen.has(barcode)) continue;
      seen.add(barcode);

      const name = pickName(product);
      if (!name) {
        skipped += 1;
        continue;
      }

      const { portionType, portionSize, calories } = resolveNutrition(product);
      const row = {
        name,
        category: mapCategory(product),
        market: MARKET,
        portionType,
        portionSize,
        calories,
        ranking: nutriScoreToRanking(product.nutriscore_grade),
        imageUrl:
          typeof product.image_front_url === "string" && product.image_front_url
            ? product.image_front_url
            : null,
        barcode,
      };

      const existing = await sql`SELECT id FROM foods WHERE barcode = ${barcode} LIMIT 1`;

      if (existing.length > 0) {
        if (FORCE_UPDATE) {
          await sql`
            UPDATE foods SET
              name = ${row.name},
              category = ${row.category},
              market = ${row.market},
              portion_type = ${row.portionType},
              portion_size = ${row.portionSize},
              calories = ${row.calories},
              ranking = ${row.ranking},
              image_url = ${row.imageUrl},
              source = ${SOURCE},
              updated_at = now()
            WHERE barcode = ${barcode}
          `;
          updated += 1;
        } else {
          skipped += 1;
        }
      } else {
        await sql`
          INSERT INTO foods
            (name, category, market, portion_type, portion_size, calories, ranking, image_url, barcode, source)
          VALUES
            (${row.name}, ${row.category}, ${row.market}, ${row.portionType}, ${row.portionSize},
             ${row.calories}, ${row.ranking}, ${row.imageUrl}, ${row.barcode}, ${SOURCE})
        `;
        inserted += 1;
      }

      processed += 1;
      if (processed % 100 === 0) {
        console.log(`  processed ${processed}  (inserted ${inserted}, updated ${updated}, skipped ${skipped})`);
      }
      if (LIMIT && processed >= LIMIT) {
        console.log("Reached --limit, stopping.");
        await report();
        return;
      }
    }

    if (page >= pageCount) break;
    page += 1;
    await sleep(THROTTLE_MS);
  }

  await report();

  async function report() {
    const total = await sql`SELECT COUNT(*)::int AS c FROM foods WHERE market = ${MARKET}`;
    console.log("\nDone.");
    console.log(`  inserted: ${inserted}`);
    console.log(`  updated:  ${updated}`);
    console.log(`  skipped:  ${skipped}`);
    console.log(`  "${MARKET}" rows now in database: ${total[0].c}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
