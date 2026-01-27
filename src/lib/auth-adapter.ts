import { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";

export function CustomAdapter(): Adapter {
  return {
    async createUser() {
      throw new Error("createUser not implemented");
    },

    async getUser(id) {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) return null;
      return { id: user.id, email: user.email, emailVerified: null };
    },

    async getUserByEmail(email) {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return null;
      return { id: user.id, email: user.email, emailVerified: null };
    },

    async getUserByAccount({ provider, providerAccountId }) {
      if (provider !== "google") return null;
      const user = await db.user.findUnique({ where: { googleId: providerAccountId } });
      if (!user) return null;
      return { id: user.id, email: user.email, emailVerified: null };
    },

    async updateUser(user) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { email: user.email ?? undefined },
      });
      return { id: updated.id, email: updated.email, emailVerified: null };
    },

    async linkAccount() {},

    async createSession(session) {
      const created = await db.session.create({
        data: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
      });
      return { sessionToken: created.sessionToken, userId: created.userId, expires: created.expires };
    },

    async getSessionAndUser(sessionToken) {
      const session = await db.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!session) return null;
      return {
        session: { sessionToken: session.sessionToken, userId: session.userId, expires: session.expires },
        user: { id: session.user.id, email: session.user.email, emailVerified: null },
      };
    },

    async updateSession(session) {
      const updated = await db.session.update({
        where: { sessionToken: session.sessionToken },
        data: { expires: session.expires },
      });
      return { sessionToken: updated.sessionToken, userId: updated.userId, expires: updated.expires };
    },

    async deleteSession(sessionToken) {
      await db.session.delete({ where: { sessionToken } });
    },

    async createVerificationToken() {
      return null;
    },
    async useVerificationToken() {
      return null;
    },
  };
}
