import { analytics } from '@repo/analytics/posthog/server';
import { getUser } from '@repo/auth/server';
import { flag } from 'flags/next';

export const createFlag = (key: string) =>
  flag({
    key,
    defaultValue: false,
    async decide() {
      const user = await getUser();

      if (!user?.id) {
        return this.defaultValue as boolean;
      }

      if (!analytics) {
        return this.defaultValue as boolean;
      }
      
      const isEnabled = await analytics.isFeatureEnabled(key, user.id);

      return isEnabled ?? (this.defaultValue as boolean);
    },
  });
