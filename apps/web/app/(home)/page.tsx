import { showBetaFeature } from '@repo/feature-flags';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import Hero from './components/hero';
import TopArtistsWrapper from './components/top-artists-wrapper';
import { TrendingShowsSlider } from './components/trending-shows-slider';

// Configure route as dynamic due to feature flags using headers
export const dynamic = 'force-dynamic';

// Dynamic imports for below-the-fold content  
const FeaturedContent = nextDynamic(() => import('./components/featured-content'), {
  loading: () => <div className="h-96 animate-pulse bg-muted" />,
});

const Features = nextDynamic(() => import('./components/features'), {
  loading: () => <div className="h-64 animate-pulse bg-muted" />,
});

const Testimonials = nextDynamic(() => import('./components/testimonials'), {
  loading: () => <div className="h-64 animate-pulse bg-muted" />,
});

const FAQ = nextDynamic(() => import('./components/faq'), {
  loading: () => <div className="h-64 animate-pulse bg-muted" />,
});

const CTA = nextDynamic(() => import('./components/cta'), {
  loading: () => <div className="h-32 animate-pulse bg-muted" />,
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
  } catch (error) {
    console.warn('Beta feature check failed:', error);
  }

  return (
    <>
      {betaFeature && (
        <div className="w-full bg-black py-2 text-center text-white">
          Beta feature now available
        </div>
      )}
      <Hero />
      <TopArtistsWrapper />
      <TrendingShowsSlider />
      <FeaturedContent />
      <Features />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
};

export default Home;
