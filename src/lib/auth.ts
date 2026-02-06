import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { CustomAdapter } from "@/lib/auth-adapter";

export const authOptions: NextAuthOptions = {
  adapter: CustomAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        await db.user.upsert({
          where: { googleId: account.providerAccountId },
          update: {},
          create: {
            googleId: account.providerAccountId,
            email: profile.email,
          },
        });
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        });
        session.user.isAdmin = dbUser?.isAdmin ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
