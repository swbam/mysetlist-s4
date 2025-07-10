'use client';

import { Star } from 'lucide-react';

export default function Testimonials() {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-center font-regular text-3xl tracking-tighter md:text-5xl">
            What music fans are saying
          </h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-md border p-6">
              <div className="flex text-yellow-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star className="h-4 w-4 fill-current" key={index} />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                "MySetlist changed how I experience live music. Being able to
                vote on setlists and track my favorite artists' shows is
                incredible!"
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20" />
                <div>
                  <p className="font-medium text-sm">Sarah M.</p>
                  <p className="text-muted-foreground text-xs">
                    Music Enthusiast
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-md border p-6">
              <div className="flex text-yellow-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star className="h-4 w-4 fill-current" key={index} />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                "Finally, a platform where fans can influence the shows they
                attend. The real-time updates during concerts are amazing!"
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20" />
                <div>
                  <p className="font-medium text-sm">Alex R.</p>
                  <p className="text-muted-foreground text-xs">
                    Concert Regular
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-md border p-6">
              <div className="flex text-yellow-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star className="h-4 w-4 fill-current" key={index} />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                "The artist discovery feature helped me find so many new bands.
                The Spotify integration makes it seamless!"
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20" />
                <div>
                  <p className="font-medium text-sm">Jamie L.</p>
                  <p className="text-muted-foreground text-xs">
                    Music Explorer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
