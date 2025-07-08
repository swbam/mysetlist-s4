'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { Progress } from '@repo/design-system/components/ui/progress';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { format } from 'date-fns';
import { Star, ThumbsUp, User } from 'lucide-react';
import { useState } from 'react';
import { markReviewHelpful } from '../actions';
import { AddReviewDialog } from './add-review-dialog';

interface Review {
  id: string;
  rating: number;
  review: string;
  acoustics: number | null;
  accessibility: number | null;
  sightlines: number | null;
  parkingEase: number | null;
  concessions: number | null;
  visitedAt: Date;
  helpful: number;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface VenueReviewsProps {
  reviews: Review[];
  venueId: string;
  avgRating: number | null;
}

export function VenueReviews({
  reviews,
  venueId,
  avgRating,
}: VenueReviewsProps) {
  const { toast } = useToast();
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage:
      (reviews.filter((r) => r.rating === rating).length / reviews.length) *
      100,
  }));

  // Calculate aspect averages
  const aspectAverages = {
    acoustics:
      reviews
        .filter((r) => r.acoustics)
        .reduce((sum, r) => sum + (r.acoustics || 0), 0) /
        reviews.filter((r) => r.acoustics).length || 0,
    accessibility:
      reviews
        .filter((r) => r.accessibility)
        .reduce((sum, r) => sum + (r.accessibility || 0), 0) /
        reviews.filter((r) => r.accessibility).length || 0,
    sightlines:
      reviews
        .filter((r) => r.sightlines)
        .reduce((sum, r) => sum + (r.sightlines || 0), 0) /
        reviews.filter((r) => r.sightlines).length || 0,
    parkingEase:
      reviews
        .filter((r) => r.parkingEase)
        .reduce((sum, r) => sum + (r.parkingEase || 0), 0) /
        reviews.filter((r) => r.parkingEase).length || 0,
    concessions:
      reviews
        .filter((r) => r.concessions)
        .reduce((sum, r) => sum + (r.concessions || 0), 0) /
        reviews.filter((r) => r.concessions).length || 0,
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (helpfulReviews.has(reviewId)) {
      toast({
        title: 'Already marked',
        description: "You've already marked this review as helpful",
        variant: 'default',
      });
      return;
    }

    const result = await markReviewHelpful(reviewId);

    if (result.success) {
      setHelpfulReviews((prev) => new Set(prev).add(reviewId));
      toast({
        title: 'Thanks!',
        description: 'Your feedback helps others',
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-muted text-muted'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-2xl">Reviews</h2>
        <AddReviewDialog venueId={venueId} />
      </div>

      {/* Rating Summary */}
      {reviews.length > 0 && (
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Overall Rating */}
            <div className="text-center md:text-left">
              <div className="mb-2 flex items-center justify-center gap-2 md:justify-start">
                <span className="font-bold text-4xl">
                  {avgRating?.toFixed(1)}
                </span>
                <div className="flex">
                  {renderStars(Math.round(avgRating || 0))}
                </div>
              </div>
              <p className="text-muted-foreground">
                Based on {reviews.length} review
                {reviews.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-3 text-sm">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="w-8 text-right text-muted-foreground text-sm">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Aspect Ratings */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 md:grid-cols-5">
            {Object.entries(aspectAverages).map(([aspect, avg]) => (
              <div key={aspect} className="text-center">
                <p className="mb-1 text-muted-foreground text-sm capitalize">
                  {aspect.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <span className="font-semibold">{avg.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-semibold text-lg">No Reviews Yet</h3>
            <p className="mb-4 text-muted-foreground">
              Be the first to review this venue!
            </p>
            <AddReviewDialog venueId={venueId} />
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="space-y-4">
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={review.user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {review.user.name ? (
                          review.user.name.charAt(0).toUpperCase()
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {review.user.name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span>•</span>
                        <span>
                          Visited{' '}
                          {format(new Date(review.visitedAt), 'MMMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <p className="text-sm leading-relaxed">{review.review}</p>

                {/* Aspect Ratings */}
                {(review.acoustics ||
                  review.accessibility ||
                  review.sightlines ||
                  review.parkingEase ||
                  review.concessions) && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {review.acoustics && (
                      <Badge variant="secondary" className="gap-1">
                        Acoustics: {review.acoustics}/5
                      </Badge>
                    )}
                    {review.accessibility && (
                      <Badge variant="secondary" className="gap-1">
                        Accessibility: {review.accessibility}/5
                      </Badge>
                    )}
                    {review.sightlines && (
                      <Badge variant="secondary" className="gap-1">
                        Sightlines: {review.sightlines}/5
                      </Badge>
                    )}
                    {review.parkingEase && (
                      <Badge variant="secondary" className="gap-1">
                        Parking: {review.parkingEase}/5
                      </Badge>
                    )}
                    {review.concessions && (
                      <Badge variant="secondary" className="gap-1">
                        Concessions: {review.concessions}/5
                      </Badge>
                    )}
                  </div>
                )}

                {/* Review Footer */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkHelpful(review.id)}
                    disabled={helpfulReviews.has(review.id)}
                  >
                    <ThumbsUp className="mr-1 h-4 w-4" />
                    Helpful ({review.helpful})
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    {format(new Date(review.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
