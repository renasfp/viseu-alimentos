# Base de Dados de Alimentos

Aplicação Next.js (App Router + TypeScript) para um nutricionista gerir a sua base
de dados de alimentos e exportar seleções em PDF para os clientes.

## Funcionalidades

- Autenticação (Auth.js / NextAuth) — acesso restrito a uma única conta de nutricionista.
- CRUD de alimentos: nome, categoria, supermercado, tipo de porção, tamanho da
  porção, calorias, ranking (1–5 estrelas) e imagem.
- Upload de imagens para o Vercel Blob.
- Pesquisa e filtros (categoria, supermercado, ranking mínimo).
- Seleção de vários alimentos e exportação para PDF (com imagens).
- Base de dados PostgreSQL (Neon), criada automaticamente no primeiro arranque.

## Configuração

Copiar `.env.example` para `.env.local` e preencher:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL (Neon). |
| `AUTH_SECRET` | String aleatória. `openssl rand -base64 32`. |
| `NUTRITIONIST_EMAIL` | Email da conta autorizada. |
| `NUTRITIONIST_PASSWORD` | Password da conta autorizada (texto simples). |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob (opcional em dev; sem ele o upload de imagem fica desativado). |

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Abrir http://localhost:3000 → redireciona para `/login`.

## Deploy (Vercel)

1. Importar o repositório no Vercel.
2. Definir as variáveis de ambiente acima em *Settings → Environment Variables*.
3. Criar um *Blob store* em *Storage* (o `BLOB_READ_WRITE_TOKEN` é injetado automaticamente).
4. A tabela `foods` é criada na primeira chamada à API.

## Estrutura

- `auth.ts` / `auth.config.ts` / `middleware.ts` — autenticação e proteção de rotas.
- `app/api/foods` — CRUD de alimentos (protegido).
- `app/api/upload` — upload de imagem para o Vercel Blob (protegido).
- `app/api/seed` — cria alguns alimentos de exemplo numa base vazia.
- `lib/db.ts` — acesso ao PostgreSQL.
- `components/FoodManager.tsx` — ecrã principal (tabela, filtros, seleção, PDF).
- `lib/pdf.ts` — geração do PDF.
