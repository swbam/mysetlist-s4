import { Calendar, Music, Vote, Zap } from 'lucide-react';

export const Features = () => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
              Everything you need for live music
            </h2>
            <p className="max-w-xl text-left text-lg text-muted-foreground leading-relaxed tracking-tight lg:max-w-lg">
              Discover concerts, track setlists, vote on songs, and connect with
              music fans worldwide
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex aspect-square h-full flex-col justify-between rounded-md bg-muted p-6 lg:col-span-2 lg:aspect-auto">
            <Music className="h-8 w-8 stroke-1 text-primary" />
            <div className="flex flex-col">
              <h3 className="text-xl tracking-tight">Artist Discovery</h3>
              <p className="max-w-xs text-base text-muted-foreground">
                Find your favorite artists and discover new ones through our
                Spotify integration
              </p>
            </div>
          </div>
          <div className="flex aspect-square flex-col justify-between rounded-md bg-muted p-6">
            <Calendar className="h-8 w-8 stroke-1 text-primary" />
            <div className="flex flex-col">
              <h3 className="text-xl tracking-tight">Show Tracking</h3>
              <p className="max-w-xs text-base text-muted-foreground">
                Never miss a concert with our comprehensive show tracking and
                notifications
              </p>
            </div>
          </div>

          <div className="flex aspect-square flex-col justify-between rounded-md bg-muted p-6">
            <Vote className="h-8 w-8 stroke-1 text-primary" />
            <div className="flex flex-col">
              <h3 className="text-xl tracking-tight">Setlist Voting</h3>
              <p className="max-w-xs text-base text-muted-foreground">
                Vote on which songs you want to hear at upcoming shows
              </p>
            </div>
          </div>
          <div className="flex aspect-square h-full flex-col justify-between rounded-md bg-muted p-6 lg:col-span-2 lg:aspect-auto">
            <Zap className="h-8 w-8 stroke-1 text-primary" />
            <div className="flex flex-col">
              <h3 className="text-xl tracking-tight">Real-time Updates</h3>
              <p className="max-w-xs text-base text-muted-foreground">
                Get instant updates on setlists, votes, and show changes as they
                happen
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
