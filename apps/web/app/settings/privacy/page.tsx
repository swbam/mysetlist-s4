import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PrivacySettings } from './components/privacy-settings';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }
  
  const { data: privacySettings } = await supabase
    .from('user_privacy_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Settings</h1>
      
      <PrivacySettings
        userId={user.id}
        email={user.email || ''}
        currentSettings={privacySettings}
      />
    </div>
  );
}