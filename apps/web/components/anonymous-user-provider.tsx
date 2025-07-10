'use client';
import { useAuth } from '~/app/providers/auth-provider';
import { useAnonymousSync } from '~/hooks/use-anonymous-sync';
import { AnonymousUserBanner } from './anonymous-user-banner';

export function AnonymousUserProvider({
  children,
}: { children: React.ReactNode }) {
  const { session } = useAuth();
  const isAuthenticated = !!session;

  // Sync anonymous actions when user signs in
  useAnonymousSync(isAuthenticated, session?.user?.id);

  return (
    <>
      {children}
      <AnonymousUserBanner isAuthenticated={isAuthenticated} />
    </>
  );
}
