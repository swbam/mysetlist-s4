"use client";

import { useConvexAuth as useConvexAuthBase, useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";

export function useConvexAuth() {
  const { isLoaded, user } = useUser();
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuthBase();
  
  // Get the app user from Convex
  const convexUser = useQuery(api.auth.loggedInUser, {});
  const createAppUser = useMutation(api.auth.createAppUser);

  // Auto-create app user if needed
  React.useEffect(() => {
    if (isAuthenticated && user && convexUser?.identity && !convexUser?.appUser) {
      createAppUser({});
    }
  }, [isAuthenticated, user, convexUser, createAppUser]);

  return {
    isLoading: !isLoaded || convexLoading,
    isAuthenticated,
    user,
    convexUser: convexUser?.appUser || null,
  };
}
