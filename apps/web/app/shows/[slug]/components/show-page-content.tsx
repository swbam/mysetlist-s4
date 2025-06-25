'use client';

import { ShowHeader } from './show-header';
import { AttendanceTracker } from './attendance-tracker';
import { TicketInfo } from './ticket-info';
import { VenueDetails } from './venue-details';
import { SetlistSection } from './setlist-section';
import { SupportingActs } from './supporting-acts';
import { ShareButtons } from './share-buttons';
import { useRealtimeUpdates } from '../hooks/use-realtime-updates';

type ShowPageContentProps = {
  show: any;
};

export function ShowPageContent({ show }: ShowPageContentProps) {
  const actualSetlists = show.setlists?.filter((s: any) => s.type === 'actual') || [];
  const predictedSetlists = show.setlists?.filter((s: any) => s.type === 'predicted') || [];
  const hasSetlists = actualSetlists.length > 0 || predictedSetlists.length > 0;
  
  // Enable real-time updates for ongoing shows
  useRealtimeUpdates(show.id, show.status === 'ongoing');
  
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        <ShowHeader show={show} />
        
        <div className="flex flex-wrap gap-4">
          <AttendanceTracker 
            showId={show.id}
            initialCount={show.attendanceCount}
            initialIsAttending={show.isAttending}
          />
          <ShareButtons 
            url={`/shows/${show.slug}`}
            title={`${show.headliner_artist.name} at ${show.venue?.name || 'TBA'}`}
          />
        </div>
        
        {show.description && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p>{show.description}</p>
          </div>
        )}
        
        {/* Supporting Acts */}
        {show.show_artists && show.show_artists.length > 1 && (
          <SupportingActs artists={show.show_artists} />
        )}
        
        {/* Setlists */}
        <SetlistSection 
          show={show}
          actualSetlists={actualSetlists}
          predictedSetlists={predictedSetlists}
          currentUser={show.currentUser}
        />
      </div>
      
      {/* Sidebar */}
      <div className="space-y-6">
        <TicketInfo 
          ticketUrl={show.ticket_url}
          minPrice={show.min_price}
          maxPrice={show.max_price}
          currency={show.currency}
          status={show.status}
        />
        
        {show.venue && (
          <VenueDetails venue={show.venue} />
        )}
      </div>
    </div>
  );
}