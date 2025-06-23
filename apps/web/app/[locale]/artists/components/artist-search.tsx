'use client';

import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

const genres = ['Rock', 'Pop', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country'];

export const ArtistSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search artists..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {genres.map(genre => (
          <Badge 
            key={genre}
            variant={selectedGenres.includes(genre) ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => toggleGenre(genre)}
          >
            {genre}
          </Badge>
        ))}
      </div>
    </div>
  );
};