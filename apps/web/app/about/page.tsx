import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Heart, Music, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import { createPageMetadata } from "~/lib/seo-metadata";
import { AboutStats } from "./components/about-stats";

export const metadata: Metadata = createPageMetadata({
  title: "About TheSet | Your Concert Companion",
  description:
    "Learn about TheSet - the ultimate platform for concert fans to vote on setlists, discover new music, and connect with fellow music lovers.",
});

const AboutPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-4xl">About TheSet</h1>
          <p className="text-muted-foreground text-xl">
            Your ultimate concert companion for discovering, voting, and
            experiencing live music
          </p>
        </div>

        {/* Mission Statement */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-semibold text-2xl">Our Mission</h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                TheSet connects music fans with their favorite artists by
                providing a platform to vote on concert setlists, discover
                upcoming shows, and share the excitement of live music
                experiences. We believe that fans should have a voice in shaping
                the concerts they attend.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vote on Setlists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Influence what songs your favorite artists play by voting on
                predicted setlists before concerts.
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
                Get live updates during concerts with real-time setlist tracking
                and fan reactions.
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
                Join a community of music lovers, share experiences, and
                discover new artists together.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-center font-bold text-3xl">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-lg text-primary-foreground">
                1
              </div>
              <h3 className="font-semibold text-lg">Discover Shows</h3>
              <p className="text-muted-foreground text-sm">
                Browse upcoming concerts from your favorite artists and venues
                near you.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-lg text-primary-foreground">
                2
              </div>
              <h3 className="font-semibold text-lg">Vote & Predict</h3>
              <p className="text-muted-foreground text-sm">
                Vote on songs you want to hear and create predicted setlists
                with other fans.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-lg text-primary-foreground">
                3
              </div>
              <h3 className="font-semibold text-lg">Experience Live</h3>
              <p className="text-muted-foreground text-sm">
                Follow along during the concert with real-time setlist updates
                and reactions.
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
            <AboutStats />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;
