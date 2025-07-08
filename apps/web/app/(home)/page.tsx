import { showBetaFeature } from '@repo/feature-flags';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Hero from './components/hero';
// import TopArtistsWrapper from './components/top-artists-wrapper';
// import { TrendingShowsSlider } from './components/trending-shows-slider';

// Dynamic imports for below-the-fold content
const FeaturedContent = dynamic(
  () =>
    import('./components/featured-content').then((mod) => ({
      default: mod.FeaturedContent,
    })),
  {
    loading: () => <div className="h-96 animate-pulse bg-muted" />,
  }
);

const Features = dynamic(
  () =>
    import('./components/features').then((mod) => ({ default: mod.Features })),
  {
    loading: () => <div className="h-64 animate-pulse bg-muted" />,
  }
);

const Testimonials = dynamic(
  () =>
    import('./components/testimonials').then((mod) => ({
      default: mod.Testimonials,
    })),
  {
    loading: () => <div className="h-64 animate-pulse bg-muted" />,
  }
);

const FAQ = dynamic(
  () => import('./components/faq').then((mod) => ({ default: mod.FAQ })),
  {
    loading: () => <div className="h-64 animate-pulse bg-muted" />,
  }
);

const CTA = dynamic(
  () => import('./components/cta').then((mod) => ({ default: mod.CTA })),
  {
    loading: () => <div className="h-32 animate-pulse bg-muted" />,
  }
);

// Configure ISR for homepage
export const revalidate = 300; // Revalidate every 5 minutes

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
      {/* Temporarily disabled to isolate crash issue */}
      {/* <TopArtistsWrapper /> */}
      {/* <TrendingShowsSlider /> */}
      <div className="py-16 text-center">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-4">🎵 Artist Data Loading...</h2>
          <p className="text-muted-foreground">
            Data-fetching components temporarily disabled for debugging
          </p>
        </div>
      </div>
      <FeaturedContent />
      <Features />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
};

export default Home;
