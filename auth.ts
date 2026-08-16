import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { withTransaction } from "@/lib/db";
import { ensureAccount } from "@/lib/accounts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.id || !user.email) return false;
      const userId = user.id;
      const email = user.email;
      await withTransaction((client) =>
        ensureAccount(client, { userId, email }),
      );
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) session.user.id = String(token.userId);
      return session;
    },
  },
});
