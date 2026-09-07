import { NextResponse } from "next/server";

import { auth } from "@/auth";

/** Returns a 401 response when there is no authenticated session, otherwise null. */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
