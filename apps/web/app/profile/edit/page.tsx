'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Switch } from '@repo/design-system/components/ui/switch';
import { MultiSelect } from '@repo/design-system/components/ui/multi-select';
import { useToast } from '@repo/design-system/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers/auth-provider';
import Link from 'next/link';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  favoriteGenres: z.array(z.string()).max(10, 'Select up to 10 genres'),
  isPublic: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const MUSIC_GENRES = [
  'Rock', 'Pop', 'Hip Hop', 'Electronic', 'Jazz', 'Classical',
  'Country', 'R&B', 'Metal', 'Indie', 'Folk', 'Blues',
  'Reggae', 'Punk', 'Soul', 'Latin', 'Alternative', 'Dance'
];

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.user_metadata?.displayName || '',
      bio: user?.user_metadata?.bio || '',
      location: user?.user_metadata?.location || '',
      website: user?.user_metadata?.website || '',
      favoriteGenres: user?.user_metadata?.favoriteGenres || [],
      isPublic: user?.user_metadata?.isPublic || false,
    }
  });

  const selectedGenres = watch('favoriteGenres');

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      router.push('/profile');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              This information will be displayed on your public profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="Your display name"
              />
              {errors.displayName && (
                <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              {errors.bio && (
                <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="City, Country"
              />
              {errors.location && (
                <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register('website')}
                placeholder="https://example.com"
                type="url"
              />
              {errors.website && (
                <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Music Preferences</CardTitle>
            <CardDescription>
              Select your favorite genres to get personalized recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Favorite Genres</Label>
              <MultiSelect
                options={MUSIC_GENRES.map(genre => ({ label: genre, value: genre }))}
                selected={selectedGenres}
                onChange={(values) => setValue('favoriteGenres', values)}
                placeholder="Select up to 10 genres"
                maxCount={10}
              />
              {errors.favoriteGenres && (
                <p className="text-sm text-destructive mt-1">{errors.favoriteGenres.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control who can see your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow other users to view your profile and activity
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={watch('isPublic')}
                onCheckedChange={(checked) => setValue('isPublic', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/profile')}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}