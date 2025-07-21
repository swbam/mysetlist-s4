'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '~/components/ui-exports';
import {
  CheckCircle,
  Edit,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Star,
  Trash,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '~/lib/supabase/client';

interface ContentActionsProps {
  type: 'artist' | 'venue' | 'show';
  item: any;
  locale: string;
}

export default function ContentActions({
  type,
  item,
  locale,
}: ContentActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const table =
        type === 'artist' ? 'artists' : type === 'venue' ? 'venues' : 'shows';
      const field = type === 'show' ? 'is_verified' : 'verified';

      const { error } = await supabase
        .from(table)
        .update({ [field]: !item[field] })
        .eq('id', item.id);

      if (error) {
        throw error;
      }

      // Log action
      await supabase.from('moderation_logs').insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: item[field] ? 'unverify_artist' : 'verify_artist',
        target_type: type,
        target_id: item.id,
        reason: `${type} ${item[field] ? 'unverified' : 'verified'} by admin`,
      });

      toast({
        title: item[field] ? 'Unverified' : 'Verified',
        description: `${item.name} has been ${item[field] ? 'unverified' : 'verified'}.`,
      });

      router.refresh();
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to update verification status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeature = async () => {
    if (type !== 'show') {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shows')
        .update({ is_featured: !item.is_featured })
        .eq('id', item.id);

      if (error) {
        throw error;
      }

      // Log action
      await supabase.from('moderation_logs').insert({
        moderator_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'feature_content',
        target_type: 'show',
        target_id: item.id,
        reason: `Show ${item.is_featured ? 'unfeatured' : 'featured'} by admin`,
      });

      toast({
        title: item.is_featured ? 'Unfeatured' : 'Featured',
        description: `${item.name} has been ${item.is_featured ? 'unfeatured' : 'featured'}.`,
      });

      router.refresh();
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to update feature status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (type !== 'artist') {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sync/artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: item.id }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();

      toast({
        title: 'Sync completed',
        description: `Artist data synced successfully. Updated ${result.updated || 0} fields.`,
      });

      router.refresh();
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to sync artist data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getViewUrl = () => {
    switch (type) {
      case 'artist':
        return `/${locale}/artists/${item.slug}`;
      case 'venue':
        return `/${locale}/venues/${item.slug}`;
      case 'show':
        return `/${locale}/shows/${item.slug}`;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={getViewUrl()} target="_blank" rel="noopener noreferrer">
            <Eye className="mr-2 h-4 w-4" />
            View {type}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit {type}
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {(type === 'artist' || type === 'show') && (
          <DropdownMenuItem onClick={handleVerify}>
            {item.verified || item.is_verified ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Unverify
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify
              </>
            )}
          </DropdownMenuItem>
        )}

        {type === 'show' && (
          <DropdownMenuItem onClick={handleFeature}>
            {item.is_featured ? (
              <>
                <Star className="mr-2 h-4 w-4" />
                Unfeature
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Feature
              </>
            )}
          </DropdownMenuItem>
        )}

        {type === 'artist' && (
          <DropdownMenuItem onClick={handleSync}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync with Spotify
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <Trash className="mr-2 h-4 w-4" />
          Delete {type}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
