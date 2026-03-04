import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") ?? formData.get("avatar");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    const ext = EXT_BY_TYPE[file.type] ?? ".jpg";
    const shortId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${session.user.id}-${shortId}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/uploads/avatars/${filename}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Avatar upload error:", e);
    return NextResponse.json(
      { error: "Failed to upload avatar." },
      { status: 500 }
    );
  }
}
