import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export default async function authenticateUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}
