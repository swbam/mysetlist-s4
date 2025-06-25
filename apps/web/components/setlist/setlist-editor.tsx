'use client';

import { useState, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Music2, 
  GripVertical, 
  Trash2, 
  Plus, 
  Save, 
  Lock, 
  Unlock,
  Edit3,
  MoreVertical 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Input } from '@repo/design-system/components/ui/input';
import { Textarea } from '@repo/design-system/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { cn } from '@repo/design-system/lib/utils';
import { toast } from 'sonner';
import { AddSongModal } from './add-song-modal';
import { VoteButton } from '../voting/vote-button';
import Image from 'next/image';

interface SetlistSong {
  id: string;
  position: number;
  notes?: string;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    durationMs?: number;
    isExplicit?: boolean;
    spotifyId?: string;
  };
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
}

interface SetlistEditorProps {
  setlist: {
    id: string;
    name: string;
    type: 'predicted' | 'actual';
    isLocked: boolean;
    createdBy: string;
    songs: SetlistSong[];
  };
  currentUser?: {
    id: string;
  };
  artistId: string;
  onUpdate?: () => void;
  canEdit?: boolean;
  canVote?: boolean;
}

export function SetlistEditor({
  setlist,
  currentUser,
  artistId,
  onUpdate,
  canEdit = false,
  canVote = false,
}: SetlistEditorProps) {
  const [songs, setSongs] = useState(setlist.songs);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [setlistName, setListName] = useState(setlist.name);
  const [isPending, startTransition] = useTransition();

  const handleDragEnd = (result: any) => {
    if (!result.destination || !canEdit) return;

    const items = Array.from(songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setSongs(updatedItems);
    
    // Save to server
    saveReorder(updatedItems);
  };

  const saveReorder = async (reorderedSongs: SetlistSong[]) => {
    try {
      const updates = reorderedSongs.map((song, index) => ({
        id: song.id,
        position: index + 1,
      }));

      const response = await fetch('/api/setlists/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setlistId: setlist.id,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder songs');
      }

      onUpdate?.();
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to reorder songs');
      // Revert changes
      setSongs(setlist.songs);
    }
  };

  const removeSong = async (songId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/setlists/songs?setlistSongId=${songId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove song');
        }

        setSongs(songs.filter(song => song.id !== songId));
        toast.success('Song removed from setlist');
        onUpdate?.();
      } catch (error) {
        console.error('Remove song error:', error);
        toast.error('Failed to remove song');
      }
    });
  };

  const updateSongNotes = async (songId: string, notes: string) => {
    try {
      const response = await fetch('/api/setlists/songs/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setlistSongId: songId,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      setSongs(songs.map(song => 
        song.id === songId ? { ...song, notes } : song
      ));
      
      onUpdate?.();
    } catch (error) {
      console.error('Update notes error:', error);
      toast.error('Failed to update notes');
    }
  };

  const toggleLock = async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/setlists/lock', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            setlistId: setlist.id,
            isLocked: !setlist.isLocked,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to toggle lock');
        }

        toast.success(setlist.isLocked ? 'Setlist unlocked' : 'Setlist locked');
        onUpdate?.();
      } catch (error) {
        console.error('Toggle lock error:', error);
        toast.error('Failed to toggle lock');
      }
    });
  };

  const handleVote = async (songId: string, voteType: 'up' | 'down' | null) => {
    try {
      const response = await fetch('/api/songs/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setlistSongId: songId,
          voteType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      // Update local state optimistically
      setSongs(songs.map(song => {
        if (song.id === songId) {
          const currentVote = song.userVote;
          const upDelta = voteType === 'up' ? 1 : (currentVote === 'up' ? -1 : 0);
          const downDelta = voteType === 'down' ? 1 : (currentVote === 'down' ? -1 : 0);
          
          return {
            ...song,
            upvotes: song.upvotes + upDelta,
            downvotes: song.downvotes + downDelta,
            netVotes: (song.upvotes + upDelta) - (song.downvotes + downDelta),
            userVote: voteType,
          };
        }
        return song;
      }));
    } catch (error) {
      console.error('Vote error:', error);
      throw error;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isEditing && canEdit ? (
                  <Input
                    value={setlistName}
                    onChange={(e) => setListName(e.target.value)}
                    className="text-lg font-semibold border-none shadow-none p-0 h-auto"
                  />
                ) : (
                  <CardTitle>{setlistName}</CardTitle>
                )}
                <Badge variant={setlist.type === 'actual' ? 'default' : 'secondary'}>
                  {setlist.type}
                </Badge>
                {setlist.isLocked && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{songs.length} songs</span>
                <span>
                  {formatDuration(songs.reduce((acc, song) => acc + (song.song.durationMs || 0), 0))}
                </span>
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
                    <Edit3 className="h-4 w-4 mr-2" />
                    {isEditing ? 'Done Editing' : 'Edit Setlist'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddSong(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Songs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleLock} disabled={isPending}>
                    {setlist.isLocked ? (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Unlock Setlist
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Lock Setlist
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {songs.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="setlist">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {songs.map((song, index) => (
                      <Draggable
                        key={song.id}
                        draggableId={song.id}
                        index={index}
                        isDragDisabled={!canEdit || !isEditing}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                              "hover:bg-muted/50",
                              isEditing && canEdit && "cursor-move"
                            )}
                          >
                            {/* Drag Handle */}
                            {isEditing && canEdit && (
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            
                            {/* Position */}
                            <div className="w-8 text-center text-sm font-medium text-muted-foreground">
                              {index + 1}
                            </div>
                            
                            {/* Album Art */}
                            <div className="relative w-10 h-10 rounded bg-muted flex-shrink-0">
                              {song.song.albumArtUrl ? (
                                <Image
                                  src={song.song.albumArtUrl}
                                  alt={song.song.album || song.song.title}
                                  fill
                                  className="object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            
                            {/* Song Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{song.song.title}</h4>
                                {song.song.isExplicit && (
                                  <Badge variant="outline" className="text-xs">
                                    E
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="truncate">{song.song.artist}</span>
                                {song.song.album && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{song.song.album}</span>
                                  </>
                                )}
                                {song.song.durationMs && (
                                  <>
                                    <span>•</span>
                                    <span>{formatDuration(song.song.durationMs)}</span>
                                  </>
                                )}
                              </div>
                              {(song.notes || isEditing) && (
                                <div className="mt-1">
                                  {isEditing && canEdit ? (
                                    <Input
                                      value={song.notes || ''}
                                      onChange={(e) => updateSongNotes(song.id, e.target.value)}
                                      placeholder="Add notes (acoustic, cover, etc.)"
                                      className="text-xs h-6"
                                    />
                                  ) : song.notes ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {song.notes}
                                    </Badge>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {/* Voting */}
                              {canVote && !isEditing && !setlist.isLocked && (
                                <VoteButton
                                  setlistSongId={song.id}
                                  currentVote={song.userVote}
                                  upvotes={song.upvotes}
                                  downvotes={song.downvotes}
                                  onVote={(voteType) => handleVote(song.id, voteType)}
                                  variant="compact"
                                  size="sm"
                                />
                              )}
                              
                              {/* Delete */}
                              {isEditing && canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeSong(song.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
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
                  <Plus className="h-4 w-4 mr-2" />
                  Add Songs
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Song Modal */}
      <AddSongModal
        open={showAddSong}
        onOpenChange={setShowAddSong}
        setlistId={setlist.id}
        artistId={artistId}
        onSongAdded={() => {
          onUpdate?.();
          // Refresh local state
          // In a real app, you'd probably refetch or get the new song from the API response
        }}
      />
    </>
  );
}