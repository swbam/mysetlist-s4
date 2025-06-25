'use client';

import { useState, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Save, X } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { toast } from 'sonner';
import { SongItem } from './song-item';
import { reorderSetlistSongs } from '../actions';

type ReorderableSetlistProps = {
  setlist: any;
  show: any;
  currentUser: any;
  onReorder?: (newOrder: any[]) => void;
  onCancel?: () => void;
};

export function ReorderableSetlist({ 
  setlist, 
  show, 
  currentUser, 
  onReorder,
  onCancel 
}: ReorderableSetlistProps) {
  const [songs, setSongs] = useState(setlist.setlist_songs || []);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setSongs(updatedItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        // Prepare the reorder data
        const reorderData = songs.map((song, index) => ({
          id: song.id,
          position: index + 1,
        }));

        await reorderSetlistSongs(setlist.id, reorderData);
        
        toast.success('Setlist reordered successfully');
        setHasChanges(false);
        onReorder?.(songs);
      } catch (error) {
        toast.error('Failed to reorder setlist');
        console.error('Reorder failed:', error);
      }
    });
  };

  const handleCancel = () => {
    setSongs(setlist.setlist_songs || []);
    setHasChanges(false);
    onCancel?.();
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      {hasChanges && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            You have unsaved changes to the song order
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Order
            </Button>
          </div>
        </div>
      )}

      {/* Drag and Drop List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="setlist-songs">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 ${
                snapshot.isDraggingOver ? 'bg-muted/20 rounded-lg p-2' : ''
              }`}
            >
              {songs.map((item, index) => (
                <Draggable 
                  key={item.id} 
                  draggableId={item.id.toString()} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${
                        snapshot.isDragging 
                          ? 'opacity-70 transform rotate-1 shadow-lg' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-sm transition-all">
                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Song Item */}
                        <div className="flex-1">
                          <SongItem
                            item={item}
                            index={index}
                            isEditing={false}
                            canVote={false}
                            onDelete={() => {}}
                          />
                        </div>
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

      {songs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No songs to reorder</p>
        </div>
      )}
    </div>
  );
}