import { env } from '@/env';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Music, MapPin, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { SearchBar } from '../../components/search-bar';

export const Hero = async () => (
  <div className="w-full bg-gradient-to-br from-primary/5 via-background to-secondary/5">
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-40">
        <div className="flex gap-2">
          <Badge variant="outline" className="px-4 py-1">
            <Users className="h-3 w-3 mr-2" />
            Community Driven
          </Badge>
          <Badge variant="outline" className="px-4 py-1">
            <Calendar className="h-3 w-3 mr-2" />
            Live Updates
          </Badge>
        </div>

        <div className="flex flex-col gap-4 text-center">
          <h1 className="max-w-4xl text-center font-regular text-4xl tracking-tighter md:text-6xl lg:text-7xl">
            Crowdsourced Concert{' '}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Setlists
            </span>
          </h1>
          <p className="max-w-2xl text-center text-lg text-muted-foreground leading-relaxed tracking-tight lg:text-xl">
            The world's largest community-driven database of concert setlists. 
            Fans contribute, vote, and share live music experiences in real-time.
          </p>
          <p className="max-w-xl text-center text-sm text-muted-foreground/80 leading-relaxed">
            Artists can discover their audience's favorites — no manual effort required
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <SearchBar />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              <Music className="h-4 w-4 mr-2" />
              Join the Community
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/shows">
              <Calendar className="h-4 w-4 mr-2" />
              Browse Tonight's Shows
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            50K+ Active Fans
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            25K+ Setlists
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            Live Tonight
          </div>
        </div>
      </div>
    </div>
  </div>
);
