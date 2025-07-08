'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Music,
  Save,
  Upload,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ProtectedRoute } from '../../components/protected-route';
import { useAuth } from '../../providers/auth-provider';

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  spotifyUsername: z
    .string()
    .max(50, 'Spotify username must be less than 50 characters')
    .optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface ProfileData {
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  spotifyUsername?: string;
  avatarUrl?: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const bioValue = watch('bio', '');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/user/profile/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          const profile = data.profile as ProfileData;

          setValue(
            'displayName',
            profile.displayName || user.email?.split('@')[0] || ''
          );
          setValue('bio', profile.bio || '');
          setValue('location', profile.location || '');
          setValue('website', profile.website || '');
          setValue('spotifyUsername', profile.spotifyUsername || '');
          setAvatarPreview(profile.avatarUrl || null);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, setValue]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add profile data
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      // Add avatar if selected
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/4 rounded bg-muted"></div>
            <div className="h-64 rounded-lg bg-muted"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (success) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Profile Updated!</CardTitle>
              <CardDescription>
                Your profile has been successfully updated. You will be
                redirected to your profile page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/profile">View Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/profile">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Link>
            </Button>
          </div>

          <div>
            <h1 className="font-bold text-3xl">Edit Profile</h1>
            <p className="text-muted-foreground">
              Update your personal information and preferences
            </p>
          </div>

          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                This information will be visible to other users on MySetlist
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Avatar Upload */}
                <div className="space-y-4">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={avatarPreview || undefined}
                        alt="Profile picture"
                      />
                      <AvatarFallback>
                        <User className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Label
                          htmlFor="avatar-upload"
                          className="cursor-pointer"
                        >
                          <div className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground">
                            <Upload className="h-4 w-4" />
                            Upload Photo
                          </div>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                        </Label>

                        {avatarPreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeAvatar}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        JPG, PNG or GIF. Max size 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    {...register('displayName')}
                    placeholder="How you'd like to be known"
                  />
                  {errors.displayName && (
                    <p className="text-destructive text-sm">
                      {errors.displayName.message}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...register('bio')}
                    placeholder="Tell us about yourself, your music taste, favorite artists..."
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Optional bio to share with other music fans</span>
                    <span>{bioValue.length}/500</span>
                  </div>
                  {errors.bio && (
                    <p className="text-destructive text-sm">
                      {errors.bio.message}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="City, State/Country"
                  />
                  {errors.location && (
                    <p className="text-destructive text-sm">
                      {errors.location.message}
                    </p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    {...register('website')}
                    placeholder="https://your-website.com"
                  />
                  {errors.website && (
                    <p className="text-destructive text-sm">
                      {errors.website.message}
                    </p>
                  )}
                </div>

                {/* Spotify Username */}
                <div className="space-y-2">
                  <Label
                    htmlFor="spotifyUsername"
                    className="flex items-center gap-2"
                  >
                    <Music className="h-4 w-4" />
                    Spotify Username
                  </Label>
                  <Input
                    id="spotifyUsername"
                    {...register('spotifyUsername')}
                    placeholder="your-spotify-username"
                  />
                  <p className="text-muted-foreground text-xs">
                    Link your Spotify profile to share your music taste
                  </p>
                  {errors.spotifyUsername && (
                    <p className="text-destructive text-sm">
                      {errors.spotifyUsername.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={saving || !isDirty}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="flex-1 sm:flex-initial"
                  >
                    <Link href="/profile">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
