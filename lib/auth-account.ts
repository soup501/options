import { auth } from "@/auth";
import { UserIdentity } from "@/lib/accounts";

export async function getAuthenticatedIdentity(): Promise<UserIdentity | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return { userId: session.user.id, email: session.user.email };
}
