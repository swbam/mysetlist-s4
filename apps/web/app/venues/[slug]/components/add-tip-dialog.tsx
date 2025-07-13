'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/design-system/components/ui/button';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/design-system/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '../../../providers/auth-provider';
import { addInsiderTip } from '../actions';

const tipFormSchema = z.object({
  tipCategory: z.string().min(1, 'Please select a category'),
  tip: z.string().min(10, 'Tip must be at least 10 characters'),
});

type TipFormValues = z.infer<typeof tipFormSchema>;

interface AddTipDialogProps {
  venueId: string;
}

export function AddTipDialog({ venueId }: AddTipDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TipFormValues>({
    resolver: zodResolver(tipFormSchema),
    defaultValues: {
      tipCategory: '',
      tip: '',
    },
  });

  const onSubmit = async (data: TipFormValues) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add tips',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addInsiderTip(venueId, user.id, data);

      if (result.success) {
        toast({
          title: 'Tip added!',
          description: 'Thank you for sharing your knowledge',
        });
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add tip',
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Lightbulb className="mr-2 h-4 w-4" />
          Add Tip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share an Insider Tip</DialogTitle>
          <DialogDescription>
            Help others have a better experience at this venue
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category */}
            <FormField
              control={form.control}
              name="tipCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="food">Food & Drinks</SelectItem>
                      <SelectItem value="entrance">
                        Entrance & Security
                      </SelectItem>
                      <SelectItem value="tickets">Tickets & Entry</SelectItem>
                      <SelectItem value="seating">Seating</SelectItem>
                      <SelectItem value="general">General Tips</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the category that best fits your tip
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tip */}
            <FormField
              control={form.control}
              name="tip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Tip*</FormLabel>
                  <Textarea
                    placeholder="Share your insider knowledge..."
                    className="min-h-[100px]"
                    {...field}
                  />
                  <FormDescription>
                    Be specific and helpful. Minimum 10 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Example Tips */}
            <div className="space-y-1 rounded-lg bg-muted p-3">
              <p className="font-medium text-xs">Example tips:</p>
              <ul className="space-y-0.5 text-muted-foreground text-xs">
                <li>
                  • "Park in the garage on 5th St - it's cheaper and only a 5
                  min walk"
                </li>
                <li>
                  • "Get there 30 mins early for merch - lines get crazy after
                  doors open"
                </li>
                <li>
                  • "Section 203 has the best sound quality for the price"
                </li>
              </ul>
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
                {isSubmitting ? 'Submitting...' : 'Share Tip'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
