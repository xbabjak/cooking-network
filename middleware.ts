import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/groceries/:path*",
    "/post/new",
    "/post/:id/edit",
    "/recommend",
    "/u/me/:path*",
  ],
};
