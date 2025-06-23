import { env } from '@/env';
import { Button } from '@repo/design-system/components/ui/button';
import type { Dictionary } from '@repo/internationalization';
import { Music, Sparkles } from 'lucide-react';
import Link from 'next/link';

type CTAProps = {
  dictionary: Dictionary;
};

export const CTA = ({ dictionary }: CTAProps) => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="flex flex-col items-center gap-8 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 text-center lg:p-14">
        <Sparkles className="h-10 w-10 text-primary" />
        <div className="flex flex-col gap-2">
          <h3 className="max-w-xl font-regular text-3xl tracking-tighter md:text-5xl">
            {dictionary.web.home.cta.title}
          </h3>
          <p className="max-w-xl text-lg text-muted-foreground leading-relaxed tracking-tight">
            {dictionary.web.home.cta.description}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="gap-4" size="lg" variant="outline" asChild>
            <Link href="/shows">
              Find Shows Near You <Music className="h-4 w-4" />
            </Link>
          </Button>
          <Button className="gap-4" size="lg" asChild>
            <Link href={env.NEXT_PUBLIC_APP_URL}>
              {dictionary.web.header.signUp} <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);
