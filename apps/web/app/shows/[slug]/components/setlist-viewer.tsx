'use client';

import { useState, useTransition } from 'react';
import { 
  Music2, 
  Clock, 
  User, 
  Lock, 
  Unlock,
  Edit,
  Trash2,
  GripVertical,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  CheckCircle,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { cn } from '@repo/design-system/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { voteSong, lockSetlist, removeSongFromSetlist } from '../actions';
import { AddSongDialog } from './add-song-dialog';
import { SongItem } from './song-item';
import { ReorderableSetlist } from './reorderable-setlist';

type SetlistViewerProps = {
  setlist: any;
  show: any;
  currentUser: any;
  type: 'actual' | 'predicted';
};

export function SetlistViewer({ setlist, show, currentUser, type }: SetlistViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const isOwner = currentUser?.id === setlist.created_by;
  const canEdit = isOwner && !setlist.is_locked;
  const totalSongs = setlist.setlist_songs?.length || 0;
  const totalDuration = setlist.setlist_songs?.reduce((acc: number, item: any) => {
    return acc + (item.song?.duration_ms || 0);
  }, 0) || 0;
  
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${minutes}m`;
  };
  
  const handleLockSetlist = () => {
    startTransition(async () => {
      try {
        await lockSetlist(setlist.id);
        toast.success('Setlist locked successfully');
      } catch (error) {
        toast.error('Failed to lock setlist');
      }
    });
  };
  
  const handleDeleteSong = (setlistSongId: string) => {
    startTransition(async () => {
      try {
        await removeSongFromSetlist(setlistSongId);
        toast.success('Song removed from setlist');
      } catch (error) {
        toast.error('Failed to remove song');
      }
    });
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>{setlist.name || 'Main Set'}</CardTitle>
                <Badge variant={type === 'actual' ? 'default' : 'secondary'}>
                  {type}
                </Badge>
                {setlist.is_locked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {setlist.accuracy_score > 90 && (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music2 className="h-3 w-3" />
                  {totalSongs} songs
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(totalDuration)}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={setlist.creator?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span>{setlist.creator?.display_name || 'Anonymous'}</span>
                </div>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(setlist.created_at))} ago</span>
              </div>
            </div>
            
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? 'Done Editing' : 'Edit Setlist'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddSong(true)}>
                    <Music2 className="h-4 w-4 mr-2" />
                    Add Songs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReordering(!isReordering)}>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    {isReordering ? 'Stop Reordering' : 'Reorder Songs'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLockSetlist}
                    disabled={isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Setlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {setlist.setlist_songs && setlist.setlist_songs.length > 0 ? (
            isReordering ? (
              <ReorderableSetlist
                setlist={setlist}
                show={show}
                currentUser={currentUser}
                onReorder={() => setIsReordering(false)}
                onCancel={() => setIsReordering(false)}
              />
            ) : (
              <div className="space-y-2">
                {setlist.setlist_songs.map((item: any, index: number) => (
                  <SongItem
                    key={item.id}
                    item={item}
                    index={index}
                    isEditing={isEditing}
                    canVote={!!currentUser && !setlist.is_locked}
                    onDelete={() => handleDeleteSong(item.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Music2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No songs added yet</p>
              {canEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowAddSong(true)}
                >
                  Add Songs
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Song Dialog */}
      {showAddSong && (
        <AddSongDialog
          setlistId={setlist.id}
          artistId={show.headliner_artist.id}
          open={showAddSong}
          onOpenChange={setShowAddSong}
        />
      )}
    </>
  );
}