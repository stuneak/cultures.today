import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          firstName: profile.given_name || profile.name?.split(" ")[0] || "",
          lastName:
            profile.family_name ||
            profile.name?.split(" ").slice(1).join(" ") ||
            "",
          isAdmin: false,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch isAdmin from database
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
