'use client';

import { Button } from '@repo/design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@repo/design-system/components/ui/radio-group';
import { Music } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createSetlist } from '../actions';

type CreateSetlistDialogProps = {
  show: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'predicted' | 'actual';
};

export function CreateSetlistDialog({
  show,
  open,
  onOpenChange,
  defaultType = 'predicted',
}: CreateSetlistDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('Main Set');
  const [type, setType] = useState<'predicted' | 'actual'>(defaultType);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const setlist = await createSetlist(
          show.id,
          show.headliner_artist.id,
          type,
          name
        );

        toast.success('Setlist created successfully');
        onOpenChange(false);
        router.refresh();
      } catch (error: any) {
        if (error.message.includes('logged in')) {
          toast.error('Please sign in to create setlists');
          router.push('/auth/sign-in');
        } else {
          toast.error('Failed to create setlist');
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Create Setlist
          </DialogTitle>
          <DialogDescription>
            Create a new setlist for {show.headliner_artist.name} at{' '}
            {show.venue?.name || 'this show'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Setlist Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Set, Encore, Acoustic Set"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Setlist Type</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="predicted" id="predicted" />
                <Label
                  htmlFor="predicted"
                  className="cursor-pointer font-normal"
                >
                  Predicted - What you think will be played
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="actual" id="actual" />
                <Label htmlFor="actual" className="cursor-pointer font-normal">
                  Actual - What was actually played
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Setlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
