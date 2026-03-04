import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateMultiavatarUrl } from "@/lib/avatar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = await getOrCreateMultiavatarUrl(session.user.id);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Generated avatar error:", e);
    return NextResponse.json(
      { error: "Failed to get generated avatar." },
      { status: 500 }
    );
  }
}
