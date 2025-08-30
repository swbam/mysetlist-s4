import { auth } from "@clerk/nextjs/server";

export async function getCurrentUser() {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  return {
    id: userId,
    userId,
  };
}

export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Authentication required");
  }
  
  return { userId };
}
