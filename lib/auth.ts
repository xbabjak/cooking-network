import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getOrCreateMultiavatarUrl } from "@/lib/avatar";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { image: await getOrCreateMultiavatarUrl(user.id) },
      });
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile) {
        const picture =
          (profile as { picture?: string }).picture ??
          (typeof (profile as { image?: string }).image === "string"
            ? (profile as { image: string }).image
            : null);
        if (picture && user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { googleImageUrl: picture, emailVerified: new Date() },
          });
        } else if (picture && user.email) {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { googleImageUrl: picture, emailVerified: new Date() },
            });
          }
        } else if (user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        } else if (user.email) {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { emailVerified: new Date() },
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.username = token.username ?? null;
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { image: true, name: true, emailVerified: true },
        });
        if (dbUser) {
          session.user.image = dbUser.image ?? undefined;
          session.user.name = dbUser.name ?? undefined;
          session.user.emailVerified = dbUser.emailVerified ?? undefined;
        }
      }
      return session;
    },
  },
};
