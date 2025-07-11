import { showBetaFeature } from '@repo/feature-flags';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import Hero from './components/hero';
import TopArtistsWrapper from './components/top-artists-wrapper';
import { TrendingShowsSlider } from './components/trending-shows-slider';
import AccessibilityEnhancements from './components/accessibility-enhancements';

// Configure route as dynamic due to feature flags using headers
export const dynamic = 'force-dynamic';

// Dynamic imports for below-the-fold content with proper loading states
const FeaturedContent = nextDynamic(
  () => import('./components/featured-content'),
  {
    loading: () => (
      <div className="py-12 md:py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            <div className="h-64 animate-pulse rounded-lg bg-muted lg:col-span-2" />
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted lg:col-span-3" />
          </div>
        </div>
      </div>
    ),
  }
);

const Features = nextDynamic(() => import('./components/features'), {
  loading: () => (
    <div className="py-16 md:py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  ),
});

const Testimonials = nextDynamic(() => import('./components/testimonials'), {
  loading: () => (
    <div className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  ),
});

const FAQ = nextDynamic(() => import('./components/faq'), {
  loading: () => (
    <div className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  ),
});

const CTA = nextDynamic(() => import('./components/cta'), {
  loading: () => (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto h-32 max-w-2xl animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  ),
});

export const generateMetadata = async (): Promise<Metadata> => {
  return createMetadata({
    title: 'MySetlist - Never Miss a Beat',
    description:
      'Discover concerts, track setlists, and connect with live music fans around the world',
  });
};

const Home = async () => {
  // Temporarily disable beta feature to isolate issues
  let betaFeature = false;
  try {
    betaFeature = await showBetaFeature();
  } catch (_error) {}

  return (
    <>
      <AccessibilityEnhancements />
      {betaFeature && (
        <div className="w-full bg-black py-2 text-center text-white" role="banner">
          <div className="container mx-auto px-4">
            <p className="text-sm font-medium">Beta feature now available</p>
          </div>
        </div>
      )}
      <main id="main-content" className="min-h-screen">
        <Hero />
        <section aria-label="Trending content">
          <TopArtistsWrapper />
          <TrendingShowsSlider />
        </section>
        <section aria-label="Featured content and site features">
          <FeaturedContent />
          <Features />
        </section>
        <section aria-label="Community and support">
          <Testimonials />
          <FAQ />
          <CTA />
        </section>
      </main>
    </>
  );
};

export default Home;
