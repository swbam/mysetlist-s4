'use client';

import { Button } from '@repo/design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import {
  Check,
  Facebook,
  Link2,
  Mail,
  MessageCircle,
  Music,
  Share2,
  Twitter,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type ShareButtonsProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  artistName?: string;
  venueName?: string;
  showDate?: string;
};

export function ShareButtons({
  url,
  title,
  description,
  artistName,
  venueName,
  showDate,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);

  const fullUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(
    description || `Check out ${title} on MySetlist`
  );

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=MySetlist,LiveMusic`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const embedCode = `<iframe src="${fullUrl}/embed" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success('Embed code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy embed code');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <>
              <DropdownMenuItem onClick={handleNativeShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share via...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem asChild>
            <a
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Twitter className="mr-2 h-4 w-4" />
              Share on X
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Facebook className="mr-2 h-4 w-4" />
              Share on Facebook
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a
              href={shareLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Share on WhatsApp
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a
              href={shareLinks.reddit}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Music className="mr-2 h-4 w-4" />
              Share on Reddit
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a href={shareLinks.email} className="flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              Share via Email
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Link Copied!
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Copy Link
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowEmbedDialog(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Embed Show
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Embed This Show</DialogTitle>
            <DialogDescription>
              Copy the embed code below to add this show to your website or
              blog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embed-code">Embed Code</Label>
              <div className="relative">
                <Input
                  id="embed-code"
                  value={embedCode}
                  readOnly
                  className="pr-12 font-mono text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  className="absolute top-1 right-1 h-7"
                  onClick={handleCopyEmbed}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="text-muted-foreground text-sm">
                  The embedded show will display information about:
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground text-sm">
                  {artistName && <li>• Artist: {artistName}</li>}
                  {venueName && <li>• Venue: {venueName}</li>}
                  {showDate && <li>• Date: {showDate}</li>}
                  <li>• Setlist and voting options</li>
                </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
