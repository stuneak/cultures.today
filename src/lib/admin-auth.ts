import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function checkAdminAuth(): Promise<
  | { user: { isAdmin: boolean } }
  | { error: string; status: 401 | 403 }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}
