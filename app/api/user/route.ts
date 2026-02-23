import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().optional(),
  username: z
    .union([
      z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/),
      z.literal(""),
    ])
    .optional(),
  image: z.union([z.string().url(), z.literal("")]).optional(),
  bio: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, username, image, bio } = parsed.data;
    const updateData: {
      name?: string | null;
      username?: string | null;
      image?: string | null;
      bio?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name || null;
    if (username !== undefined) updateData.username = username || null;
    if (image !== undefined) updateData.image = image || null;
    if (bio !== undefined) updateData.bio = bio || null;

    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: session.user.id },
        },
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: "This username is already taken." },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        image: true,
        bio: true,
      },
    });

    return NextResponse.json(user);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
