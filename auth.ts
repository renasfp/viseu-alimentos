import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        const expectedEmail = (process.env.NUTRITIONIST_EMAIL ?? "").trim().toLowerCase();
        const expectedPassword = process.env.NUTRITIONIST_PASSWORD ?? "";

        if (!expectedEmail || !expectedPassword) return null;
        if (email !== expectedEmail || password !== expectedPassword) return null;

        return { id: "nutritionist", email: expectedEmail, name: "Nutricionista" };
      },
    }),
  ],
});
