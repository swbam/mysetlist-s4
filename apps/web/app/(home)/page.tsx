import { showBetaFeature } from '@repo/feature-flags';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { Cases } from './components/cases';
import { CTA } from './components/cta';
import { FAQ } from './components/faq';
import { Features } from './components/features';
import { Hero } from './components/hero';
import { Testimonials } from './components/testimonials';
import { Trending } from './components/trending';

export const generateMetadata = async (): Promise<Metadata> => {
  return createMetadata({
    title: 'MySetlist - Never Miss a Beat',
    description: 'Discover concerts, track setlists, and connect with live music fans around the world',
  });
};

const Home = async () => {
  const betaFeature = await showBetaFeature();

  return (
    <>
      {betaFeature && (
        <div className="w-full bg-black py-2 text-center text-white">
          Beta feature now available
        </div>
      )}
      <Hero />
      <Trending />
      <Cases />
      <Features />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
};

export default Home;
