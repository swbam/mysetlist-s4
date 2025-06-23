'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Camera, X } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Dialog, DialogContent } from '@repo/design-system/components/ui/dialog';
import { Badge } from '@repo/design-system/components/ui/badge';
import { AddPhotoDialog } from './add-photo-dialog';

interface Photo {
  id: string;
  imageUrl: string;
  caption: string | null;
  photoType: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
  };
}

interface VenuePhotosProps {
  photos: Photo[];
  venueId: string;
  venueName: string;
}

export function VenuePhotos({ photos, venueId, venueName }: VenuePhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const photoTypeLabels: Record<string, string> = {
    interior: 'Interior',
    exterior: 'Exterior',
    seating: 'Seating',
    stage: 'Stage',
    concessions: 'Concessions',
    parking: 'Parking',
    entrance: 'Entrance',
    other: 'Other',
  };

  // Group photos by type
  const photosByType = photos.reduce((acc, photo) => {
    const type = photo.photoType || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  if (photos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Photos</h2>
          <AddPhotoDialog venueId={venueId} />
        </div>
        
        <Card className="p-8 text-center">
          <Camera className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Photos Yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to share photos of this venue!
          </p>
          <AddPhotoDialog venueId={venueId} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Photos</h2>
        <AddPhotoDialog venueId={venueId} />
      </div>

      {/* Photo Grid by Type */}
      {Object.entries(photosByType).map(([type, typePhotos]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">
              {photoTypeLabels[type] || type}
            </h3>
            <Badge variant="secondary">{typePhotos.length}</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {typePhotos.map((photo) => (
              <Card
                key={photo.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="relative aspect-square">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.caption || `${venueName} photo`}
                    fill
                    className="object-cover"
                  />
                </div>
                {photo.caption && (
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedPhoto && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              
              <div className="relative aspect-video">
                <Image
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.caption || `${venueName} photo`}
                  fill
                  className="object-contain"
                />
              </div>
              
              <div className="p-4 space-y-2">
                {selectedPhoto.caption && (
                  <p className="text-sm">{selectedPhoto.caption}</p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    By {selectedPhoto.user.name || 'Anonymous'}
                  </span>
                  <span>
                    {format(new Date(selectedPhoto.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}