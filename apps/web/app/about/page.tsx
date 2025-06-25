import { createPageMetadata } from '@/lib/seo-metadata';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Music, Users, Zap, Heart } from 'lucide-react';

export const metadata: Metadata = createPageMetadata({
  title: 'About MySetlist | Your Concert Companion',
  description: 'Learn about MySetlist - the ultimate platform for concert fans to vote on setlists, discover new music, and connect with fellow music lovers.',
});

const AboutPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">About MySetlist</h1>
          <p className="text-xl text-muted-foreground">
            Your ultimate concert companion for discovering, voting, and experiencing live music
          </p>
        </div>

        {/* Mission Statement */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Our Mission</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                MySetlist connects music fans with their favorite artists by providing a platform to vote on concert setlists, 
                discover upcoming shows, and share the excitement of live music experiences. We believe that fans should have 
                a voice in shaping the concerts they attend.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vote on Setlists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Influence what songs your favorite artists play by voting on predicted setlists before concerts.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Get live updates during concerts with real-time setlist tracking and fan reactions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Connect with Fans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Join a community of music lovers, share experiences, and discover new artists together.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold">Discover Shows</h3>
              <p className="text-muted-foreground text-sm">
                Browse upcoming concerts from your favorite artists and venues near you.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold">Vote & Predict</h3>
              <p className="text-muted-foreground text-sm">
                Vote on songs you want to hear and create predicted setlists with other fans.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold">Experience Live</h3>
              <p className="text-muted-foreground text-sm">
                Follow along during the concert with real-time setlist updates and reactions.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Join the Community</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">10K+</div>
                <div className="text-muted-foreground">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-muted-foreground">Artists Tracked</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">1K+</div>
                <div className="text-muted-foreground">Shows Covered</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;