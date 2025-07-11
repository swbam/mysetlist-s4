'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/design-system/components/ui/button';
import { Calendar } from '@repo/design-system/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/design-system/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/design-system/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/design-system/components/ui/popover';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { cn } from '@repo/design-system/lib/utils';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '../../../providers/auth-provider';
import { addVenueReview } from '../actions';

const reviewFormSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().min(10, 'Review must be at least 10 characters'),
  acoustics: z.number().min(1).max(5).optional(),
  accessibility: z.number().min(1).max(5).optional(),
  sightlines: z.number().min(1).max(5).optional(),
  parkingEase: z.number().min(1).max(5).optional(),
  concessions: z.number().min(1).max(5).optional(),
  visitedAt: z.date({
    required_error: 'Please select when you visited',
  }),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface AddReviewDialogProps {
  venueId: string;
}

export function AddReviewDialog({ venueId }: AddReviewDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      review: '',
      visitedAt: new Date(),
    },
  });

  const onSubmit = async (data: ReviewFormValues) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add a review',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addVenueReview(venueId, user.id, {
        rating: data.rating,
        review: data.review,
        visitedAt: data.visitedAt,
        ...(data.acoustics !== undefined && { acoustics: data.acoustics }),
        ...(data.accessibility !== undefined && { accessibility: data.accessibility }),
        ...(data.sightlines !== undefined && { sightlines: data.sightlines }),
        ...(data.parkingEase !== undefined && { parkingEase: data.parkingEase }),
        ...(data.concessions !== undefined && { concessions: data.concessions }),
      });

      if (result.success) {
        toast({
          title: 'Review added!',
          description: 'Thank you for sharing your experience',
        });
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add review',
          variant: 'destructive',
        });
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: { value: number; onChange: (value: number) => void; label: string }) => (
    <div className="space-y-2">
      <label className="font-medium text-sm">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'h-6 w-6',
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-muted text-muted'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Write a Review</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience at this venue
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Overall Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      label="Overall Rating*"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visit Date */}
            <FormField
              control={form.control}
              name="visitedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Visit Date*</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Written Review */}
            <FormField
              control={form.control}
              name="review"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your experience..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Minimum 10 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aspect Ratings */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">
                Rate Specific Aspects (Optional)
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="acoustics"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          label="Acoustics"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sightlines"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          label="Sightlines"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          label="Accessibility"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parkingEase"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          label="Parking Ease"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concessions"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          label="Concessions"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
