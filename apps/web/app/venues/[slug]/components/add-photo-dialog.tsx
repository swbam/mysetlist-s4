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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/design-system/components/ui/form';
import { Input } from '@repo/design-system/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/ui/select';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '../../../providers/auth-provider';
import { addVenuePhoto } from '../actions';

const photoFormSchema = z.object({
  imageUrl: z.string().url('Please enter a valid image URL'),
  caption: z.string().optional(),
  photoType: z.string().optional(),
});

type PhotoFormValues = z.infer<typeof photoFormSchema>;

interface AddPhotoDialogProps {
  venueId: string;
}

export function AddPhotoDialog({ venueId }: AddPhotoDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PhotoFormValues>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      imageUrl: '',
      caption: '',
      photoType: 'other',
    },
  });

  const onSubmit = async (data: PhotoFormValues) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add photos',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addVenuePhoto(venueId, user.id, data);

      if (result.success) {
        toast({
          title: 'Photo added!',
          description: 'Thank you for contributing',
        });
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add photo',
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
          <Camera className="mr-2 h-4 w-4" />
          Add Photo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Venue Photo</DialogTitle>
          <DialogDescription>
            Share a photo of this venue with the community
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Image URL */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Enter the URL of your image</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Type */}
            <FormField
              control={form.control}
              name="photoType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select photo type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="interior">Interior</SelectItem>
                      <SelectItem value="exterior">Exterior</SelectItem>
                      <SelectItem value="seating">Seating</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="concessions">Concessions</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="entrance">Entrance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Caption */}
            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a caption..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Uploading...' : 'Add Photo'}
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-4 rounded-lg bg-muted p-4">
          <p className="text-muted-foreground text-sm">
            <strong>Note:</strong> In a production app, you would upload images
            directly. For now, please use an image hosting service and provide
            the URL.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
