import { ArrowUp, Users, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { getWeeklyTrending, type TrendingItem } from '@/lib/trending';

async function TrendingCard({ item }: { item: TrendingItem }) {
  const isShow = item.type === 'show';
  const href = isShow 
    ? `/shows/${item.slug}` 
    : `/artists/${item.slug}`;

  return (
    <Link 
      href={href}
      className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-lg">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
            <span className="text-2xl font-bold text-gray-400">
              {item.name[0]}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary dark:text-white">
          {item.name}
        </h3>
        {isShow && item.show_date && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="mr-1 inline h-3 w-3" />
            {formatDistanceToNow(new Date(item.show_date), { addSuffix: true })}
          </p>
        )}
        {item.venue_name && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {item.venue_name}
          </p>
        )}
      </div>
      
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          {item.votes}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-4 w-4" />
          {item.attendees}
        </div>
      </div>
    </Link>
  );
}

export async function Trending() {
  const { shows, artists } = await getWeeklyTrending(5);
  
  if (shows.length === 0 && artists.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Trending This Week
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Discover what&apos;s hot in the live music scene
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Trending Shows */}
          <div>
            <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              🔥 Hot Shows
            </h3>
            <div className="space-y-4">
              {shows.map((show) => (
                <TrendingCard key={show.id} item={show} />
              ))}
            </div>
            <Link
              href="/trending?tab=shows"
              className="mt-6 inline-flex items-center text-primary hover:underline"
            >
              View all trending shows →
            </Link>
          </div>

          {/* Trending Artists */}
          <div>
            <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              ⭐ Rising Artists
            </h3>
            <div className="space-y-4">
              {artists.map((artist) => (
                <TrendingCard key={artist.id} item={artist} />
              ))}
            </div>
            <Link
              href="/trending?tab=artists"
              className="mt-6 inline-flex items-center text-primary hover:underline"
            >
              View all trending artists →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}