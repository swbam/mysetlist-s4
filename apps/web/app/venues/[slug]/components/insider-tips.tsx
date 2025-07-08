'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { format } from 'date-fns';
import {
  Car,
  Info,
  Lightbulb,
  MapPin,
  Music,
  ThumbsUp,
  Ticket,
  Utensils,
} from 'lucide-react';
import { useState } from 'react';
import { markTipHelpful } from '../actions';
import { AddTipDialog } from './add-tip-dialog';

interface Tip {
  id: string;
  tipCategory: string;
  tip: string;
  helpful: number;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
  };
}

interface InsiderTipsProps {
  tips: Tip[];
  venueId: string;
}

export function InsiderTips({ tips, venueId }: InsiderTipsProps) {
  const { toast } = useToast();
  const [helpfulTips, setHelpfulTips] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryIcons: Record<string, any> = {
    parking: Car,
    food: Utensils,
    entrance: MapPin,
    tickets: Ticket,
    seating: Music,
    general: Info,
  };

  const categoryLabels: Record<string, string> = {
    parking: 'Parking',
    food: 'Food & Drinks',
    entrance: 'Entrance & Security',
    tickets: 'Tickets & Entry',
    seating: 'Seating',
    general: 'General Tips',
  };

  // Get unique categories
  const categories = Array.from(new Set(tips.map((tip) => tip.tipCategory)));

  // Filter tips by category
  const filteredTips = selectedCategory
    ? tips.filter((tip) => tip.tipCategory === selectedCategory)
    : tips;

  const handleMarkHelpful = async (tipId: string) => {
    if (helpfulTips.has(tipId)) {
      toast({
        title: 'Already marked',
        description: "You've already marked this tip as helpful",
        variant: 'default',
      });
      return;
    }

    const result = await markTipHelpful(tipId);

    if (result.success) {
      setHelpfulTips((prev) => new Set(prev).add(tipId));
      toast({
        title: 'Thanks!',
        description: 'Your feedback helps others',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-2xl">Insider Tips</h2>
        <AddTipDialog venueId={venueId} />
      </div>

      {tips.length === 0 ? (
        <Card className="p-8 text-center">
          <Lightbulb className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No Tips Yet</h3>
          <p className="mb-4 text-muted-foreground">
            Be the first to share insider knowledge about this venue!
          </p>
          <AddTipDialog venueId={venueId} />
        </Card>
      ) : (
        <>
          {/* Category Filters */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Tips ({tips.length})
              </Button>
              {categories.map((category) => {
                const Icon = categoryIcons[category] || Info;
                const count = tips.filter(
                  (t) => t.tipCategory === category
                ).length;

                return (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {categoryLabels[category] || category} ({count})
                  </Button>
                );
              })}
            </div>
          )}

          {/* Tips List */}
          <div className="space-y-4">
            {filteredTips.map((tip) => {
              const Icon = categoryIcons[tip.tipCategory] || Info;

              return (
                <Card key={tip.id} className="p-4">
                  <div className="space-y-3">
                    {/* Tip Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {categoryLabels[tip.tipCategory] || tip.tipCategory}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            by {tip.user.name || 'Anonymous'}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{tip.tip}</p>
                      </div>
                    </div>

                    {/* Tip Footer */}
                    <div className="flex items-center justify-between pl-11">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkHelpful(tip.id)}
                        disabled={helpfulTips.has(tip.id)}
                      >
                        <ThumbsUp className="mr-1 h-4 w-4" />
                        Helpful ({tip.helpful})
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        {format(new Date(tip.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
