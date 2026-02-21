import { prisma } from "@/lib/prisma";

export async function getPostsByAuthorId(authorId: string, limit = 20) {
  return prisma.post.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, bio: true },
      },
    },
  });
}

export async function getPostById(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
      recipe: {
        include: { ingredients: true },
      },
    },
  });
}

export async function getFeedPosts(limit = 50) {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  });
}
