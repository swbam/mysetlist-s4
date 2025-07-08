import { getUser } from '@repo/auth/server';
import { redirect } from 'next/navigation';
import { FollowingList } from './components/following-list';

export const metadata = {
  title: 'Following - MySetlist',
  description: 'Artists you follow',
};

export default async function FollowingPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 font-bold text-3xl">Artists You Follow</h1>
      <FollowingList />
    </div>
  );
}
