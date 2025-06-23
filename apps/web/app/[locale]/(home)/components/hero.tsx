import { env } from '@/env';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import type { Dictionary } from '@repo/internationalization';
import { Music, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';
import { SearchBar } from '../../components/search-bar';

type HeroProps = {
  dictionary: Dictionary;
};

export const Hero = async ({ dictionary }: HeroProps) => (
  <div className="w-full">
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-40">
        <div className="flex gap-2">
          <Badge variant="outline" className="px-4 py-1">
            <Calendar className="h-3 w-3 mr-2" />
            Tonight's Shows
          </Badge>
          <Badge variant="outline" className="px-4 py-1">
            <MapPin className="h-3 w-3 mr-2" />
            Near You
          </Badge>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="max-w-2xl text-center font-regular text-5xl tracking-tighter md:text-7xl">
            {dictionary.web.home.meta.title}
          </h1>
          <p className="max-w-2xl text-center text-lg text-muted-foreground leading-relaxed tracking-tight md:text-xl">
            {dictionary.web.home.meta.description}
          </p>
        </div>
        
        <div className="w-full max-w-2xl">
          <SearchBar />
        </div>
        
        <div className="flex flex-row gap-3">
          <Button size="lg" className="gap-4" variant="outline" asChild>
            <Link href="/shows">
              Browse Shows <Calendar className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" className="gap-4" asChild>
            <Link href={env.NEXT_PUBLIC_APP_URL}>
              {dictionary.web.header.signUp} <Music className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);
