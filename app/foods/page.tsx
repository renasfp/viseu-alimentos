import { auth, signOut } from "@/auth";
import { FoodManager } from "@/components/FoodManager";

export default async function FoodsPage() {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-emerald-900">
              Base de Dados de Alimentos
            </h1>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      </header>

      <FoodManager />
    </div>
  );
}
