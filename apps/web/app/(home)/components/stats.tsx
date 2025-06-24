import { Users, Music, Calendar, MapPin } from 'lucide-react';

export const Stats = () => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">50K+</h3>
          <p className="text-muted-foreground">Active music fans</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Music className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">25K+</h3>
          <p className="text-muted-foreground">Artists tracked</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">10K+</h3>
          <p className="text-muted-foreground">Shows cataloged</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">500+</h3>
          <p className="text-muted-foreground">Cities covered</p>
        </div>
      </div>
    </div>
  </div>
);
