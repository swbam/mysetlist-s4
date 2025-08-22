# The Set - Product Requirements Document

## Executive Summary

**The Set** is a concert setlist platform that allows music fans to discover artists, track upcoming shows, and collaboratively build accurate setlists in real-time. The application focuses on four core activities: **Discover**, **Track**, **Vote**, and **Share**.

### Core Vision
- **Discover**: Find artists and upcoming shows through integrated data from Spotify, Ticketmaster, and Setlist.fm
- **Track**: Follow favorite artists and get notified of new shows
- **Vote**: Collaboratively build setlists by voting on songs during live shows
- **Share**: Artists and fans can share show links to promote setlist collaboration

### Target Users
- **Music Fans**: Discover new shows and track favorite artists
- **Concert Goers**: Contribute real-time setlist information during shows
- **Artists**: Share shows and engage with fans through verified setlists

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The system consists of three main components:

**Frontend Application**:
- Responsive web application with mobile optimization
- Real-time updates via WebSocket connections
- Progressive Web App (PWA) capabilities for offline access
- Server-Side Rendering (SSR) for SEO and performance

**Backend Services**:
- RESTful API with real-time WebSocket support  
- Background job processing system with queues
- External API integration layer with rate limiting
- Database layer with caching for performance

**Data Integration**:
- Multi-source data synchronization from external APIs
- Real-time progress tracking for import operations
- Conflict resolution for duplicate data across sources
- Background sync jobs with error handling and retry logic

### 1.2 Key Technical Challenges

**Multi-Phase Artist Import**:
- Provide instant response (< 3 seconds) while importing comprehensive data in background
- Real-time progress updates via Server-Sent Events (SSE)
- Handle API rate limits and large dataset imports gracefully

**Real-Time Collaboration**:
- Multiple users simultaneously editing setlists during live shows
- Conflict resolution for concurrent edits
- WebSocket connection management with poor venue connectivity

**External API Management**:
- Handle rate limits from Spotify (1000/hour), Setlist.fm (2/second), Ticketmaster (5000/day)
- Data consistency across multiple sources with different schemas
- Fallback mechanisms when APIs are unavailable

---

## 2. Core Data Models

### 2.1 Primary Entities

**Users**:
```
Users:
- id (primary key)
- email (unique)
- display_name
- spotify_id (unique, nullable)
- profile_image_url
- created_at, updated_at
- email_verified
```

**Artists**:
```
Artists:
- id (primary key) 
- name
- slug (unique)
- biography
- spotify_id (unique)
- profile_images (JSON)
- follower_count
- created_at, updated_at
- import_status (pending, importing, completed, failed)
```

**Shows**:
```
Shows:
- id (primary key)
- name
- date
- venue_id (foreign key)
- headliner_artist_id (foreign key) 
- status (upcoming, completed, cancelled)
- ticket_url
- created_at, updated_at
```

**Venues**:
```
Venues:
- id (primary key)
- name
- city, region, country
- address
- latitude, longitude
- created_at, updated_at
```

**Setlists**:
```
Setlists:
- id (primary key)
- show_id (foreign key)
- songs (JSON array: [{name, artist, order, votes}])
- status (draft, live, completed)
- created_at, updated_at
```

**User Follows Artists**:
```
UserFollowsArtists:
- user_id (foreign key)
- artist_id (foreign key)  
- created_at
- (composite primary key)
```

**Votes**:
```
Votes:
- id (primary key)
- user_id (foreign key)
- setlist_id (foreign key)
- song_name
- vote_type (upvote, downvote)
- created_at
```

### 2.2 Key Relationships

- Users → Artists (many-to-many: following)
- Artists → Shows (one-to-many: performances)
- Shows → Venues (many-to-one: location)
- Shows → Setlists (one-to-one: setlist per show)
- Users → Votes (one-to-many: voting history)
- Setlists → Votes (one-to-many: votes per setlist)

---

## 3. Artist Import System (Core Differentiator)

### 3.1 Multi-Phase Import Process

The artist import system provides a fast user experience while handling comprehensive data ingestion in the background.

#### Phase 1: Instant Response (< 3 seconds)
**Objective**: Provide immediate navigation while queuing background work

**Process**:
1. Create placeholder artist record with basic information (name, slug)
2. Set import_status to "pending"
3. Return artist ID and slug to client
4. Navigate user to artist page with loading skeleton
5. Queue Phase 2 job for immediate processing

**API Response**:
```json
{
  "artist_id": "123",
  "slug": "artist-name", 
  "status": "importing",
  "progress": 0
}
```

#### Phase 2: Priority Data (3-15 seconds)
**Objective**: Load essential information for immediate user value

**Process**:
1. Fetch artist metadata from Spotify API
2. Import upcoming shows from Ticketmaster API
3. Create venue records for show locations
4. Update artist record with complete information
5. Set import_status to "importing"
6. Send progress updates via Server-Sent Events (SSE)
7. Queue Phase 3 job for comprehensive data import

**Progress Updates**:
```json
{
  "artist_id": "123",
  "progress": 25,
  "status": "importing",
  "current_phase": "shows",
  "shows_imported": 5
}
```

#### Phase 3: Full Catalog (15-90 seconds)
**Objective**: Import comprehensive artist data for complete user experience

**Process**:
1. Import full discography from Spotify API
2. Filter out live albums, remixes, and compilations
3. Import historical setlist data from Setlist.fm API  
4. Cross-reference and validate data across sources
5. Set import_status to "completed"
6. Send final progress update to client

**Final Response**:
```json
{
  "artist_id": "123", 
  "progress": 100,
  "status": "completed",
  "albums_imported": 12,
  "shows_imported": 25,
  "setlists_imported": 18
}
```

### 3.2 Progress Tracking System

**Real-Time Updates**:
- Server-Sent Events (SSE) for progress updates
- WebSocket fallback for real-time communication
- Client-side progress bar with phase descriptions
- Error handling with user-friendly messages

**Import Job Management**:
- Priority queue system for import jobs
- Retry mechanisms with exponential backoff
- Dead letter queue for failed imports
- Import status tracking in database
- Admin interface for monitoring import progress

---

## 4. External API Integrations

### 4.1 Spotify API Integration

**Authentication**:
- OAuth2 flow for user authentication
- Client credentials flow for app-level access
- Token refresh mechanism for continuous access
- Scope management for required permissions

**Data Sources**:
- Artist metadata (name, bio, images, genres)
- Discography (albums, tracks, release dates, ISRC codes)
- User's top artists for recommendations
- Audio features for music analysis

**Rate Limiting**:
- 1000 requests per hour per application
- Exponential backoff for rate limit handling
- Request batching where possible
- Caching to minimize API calls

**Implementation Requirements**:
```javascript
// Example API calls needed
const artistData = await spotifyAPI.getArtist(spotifyId);
const albums = await spotifyAPI.getArtistAlbums(spotifyId);
const topTracks = await spotifyAPI.getArtistTopTracks(spotifyId);
```

### 4.2 Ticketmaster API Integration

**Show Discovery**:
- Artist-based show search using multiple identifiers
- Geographic filtering for location-based recommendations
- Date range filtering for upcoming shows
- Venue information with location data

**Data Synchronization**:
- Daily sync for upcoming shows
- Real-time updates for show changes
- Venue creation and updating
- Ticket availability status

**Rate Limiting**:
- 5000 requests per day
- Request throttling and queue management
- Priority handling for user-requested imports

### 4.3 Setlist.fm API Integration  

**Historical Data**:
- Artist setlist history import
- Show and venue data synchronization
- Song performance statistics
- Tour and festival information

**Rate Limiting**:
- 2 requests per second maximum
- Strict rate limiting enforcement
- Background processing for large imports
- Data validation and cleaning

**Challenges**:
- Inconsistent data quality requiring validation
- Missing or incomplete setlist information
- Duplicate detection across different naming conventions
- Historical data gaps requiring interpolation

---

## 5. Core Application Features

### 5.1 User Authentication & Profiles

**Spotify Authentication**:
- OAuth2 integration with Spotify login
- Profile creation with Spotify data (name, image, top artists)
- Account linking and unlinking
- Traditional email/password authentication as fallback

**User Profile Management**:
- Basic profile editing (name, profile image)
- Privacy settings for profile visibility
- Email notification preferences
- Account deletion and data export

### 5.2 Artist Discovery & Following

**Artist Search**:
- Full-text search across artist names
- Search results with artist images and basic info
- Autocomplete suggestions for better UX
- "Artist not found" option to trigger import

**Artist Profiles**:
- Comprehensive artist information from Spotify
- Upcoming shows list with dates and venues
- Historical show data and setlist statistics
- Follow/unfollow functionality with real-time counts

**Following System**:
- Follow artists to receive show notifications
- Followed artists dashboard with recent activity
- Email notifications for new shows (configurable)
- Unfollow functionality with confirmation

### 5.3 Show & Venue Management

**Show Discovery**:
- Upcoming shows for followed artists
- Show details with venue, date, ticket links
- Integration with artist profiles and setlist history

**Show Information**:
- Basic show details (date, time, venue, lineup)
- Ticket purchasing links (affiliate integration)
- Venue information with location and directions
- Show status updates (upcoming, completed, cancelled)

**Venue Profiles**:
- Venue information with address and location
- Past shows at venue with artist history
- Basic amenities and capacity information
- Integration with mapping services for directions

### 5.4 Setlist System & Voting

**Setlist Creation**:
- One setlist per show with collaborative editing
- Song addition through search with artist's discography
- Drag-and-drop reordering of songs
- Encore and special section support

**Collaborative Editing**:
- Multiple users can edit setlists simultaneously
- Real-time updates via WebSocket connections
- Conflict resolution for concurrent edits
- Version history and rollback capabilities

**Voting System**:
- Upvote/downvote songs for accuracy verification
- Vote aggregation to determine final setlist
- User reputation system based on vote quality
- Community moderation for spam and abuse

**Setlist Display**:
- Clean, readable setlist format
- Song order with timing information
- Vote counts and accuracy indicators
- Export functionality for sharing

---

## 6. Real-Time Collaboration System

### 6.1 WebSocket Architecture

**Connection Management**:
- WebSocket connections for live setlist editing
- Connection pooling and scaling across multiple servers
- Automatic reconnection handling for poor connectivity
- Graceful degradation to polling fallback

**Real-Time Features**:
- Live setlist updates during concurrent editing
- Real-time vote counting and display
- User presence indicators (who's currently editing)
- Live chat functionality during shows (optional)

**Conflict Resolution**:
- Operational Transformation (OT) for concurrent edits
- Last-writer-wins for simple conflicts
- Merge algorithms for complex song reordering
- User notification for rejected edits

### 6.2 Concert Venue Optimization

**Mobile-First Design**:
- Touch-optimized interface for mobile devices
- Large touch targets for easy interaction in dark venues
- Minimal data usage for poor cellular connections
- Offline capabilities for basic setlist viewing

**Connectivity Handling**:
- Progressive loading with critical content first
- Local caching for offline functionality
- Retry mechanisms for failed requests
- Background sync when connection restored

---

## 7. Background Job System

### 7.1 Job Queue Architecture

**Queue Types**:
- High priority: User-requested artist imports
- Medium priority: Daily data synchronization  
- Low priority: Historical data backfill and cleanup

**Job Processing**:
- Worker processes with configurable concurrency
- Job retry mechanisms with exponential backoff
- Dead letter queues for permanently failed jobs
- Job scheduling with cron-like syntax

**Monitoring & Management**:
- Job queue monitoring dashboard
- Failed job retry interface
- Performance metrics and alerts
- Queue size and processing rate tracking

### 7.2 Sync & Maintenance Jobs

**Artist Data Sync**:
- Daily updates for active artists (those with followers)
- Weekly full catalog refresh for comprehensive artists
- Real-time updates for high-priority artists
- Historical data backfill for newly imported artists

**Show Data Management**:
- Daily import of new shows from Ticketmaster
- Show status updates (completed, cancelled)
- Venue data synchronization and validation
- Duplicate show detection and merging

**Email Notifications**:
- New show notifications for followed artists
- Weekly digest emails with upcoming shows
- System notifications and important updates
- Email queue processing with rate limiting

**System Maintenance**:
- Database cleanup for old data
- Image optimization and storage management
- Search index updates and rebuilding
- Performance monitoring and alerting

---

## 8. Search & Discovery

### 8.1 Search Functionality

**Artist Search**:
- Full-text search with fuzzy matching
- Search across artist names and aliases
- Autocomplete suggestions with search history
- "Import new artist" option for missing artists

**Show Search**:
- Search shows by artist, venue, or date
- Location-based search for local shows
- Date range filtering for specific time periods
- Integration with artist and venue profiles

**Search Implementation**:
- Database full-text search with indexing
- Search result ranking by relevance and popularity
- Search analytics for improving results
- Search performance optimization

### 8.2 Discovery Features

**Trending Artists**:
- Algorithm based on follower growth and activity
- Geographic trending for local discovery
- Genre-based trending sections
- New artist highlights and recommendations

**Personalized Recommendations**:
- Recommendations based on followed artists
- Location-based show suggestions
- Similar artist discovery using music data
- Collaborative filtering from user behavior

---

## 9. Email Notification System

### 9.1 Notification Types

**Welcome Sequence**:
- Immediate welcome email with platform overview
- Follow-up email with artist discovery tips
- Tutorial email for setlist collaboration features

**Show Notifications**:
- New show announcements for followed artists
- Customizable timing (immediate, daily digest, weekly digest)
- Show reminder notifications (optional)
- Location-based show recommendations

**System Notifications**:
- Account security and login notifications
- Important platform updates and features
- Community guidelines and policy changes

### 9.2 Email Management

**User Preferences**:
- Granular notification preferences by type
- Frequency controls (immediate, daily, weekly, never)
- Easy unsubscribe with partial opt-out options
- Email format preferences (HTML, text)

**Delivery System**:
- Reliable email delivery service integration
- Email queue processing with retry logic
- Bounce and spam handling
- Email analytics and delivery tracking

---

## 10. Implementation Guidelines

### 10.1 Technology Recommendations

**Backend Options**:
- **Node.js/TypeScript**: Excellent for real-time features, JavaScript ecosystem
- **Python/Django**: Strong data processing, rapid development, extensive libraries
- **Go**: High performance, excellent concurrency for background jobs

**Database Requirements**:
- **Primary Database**: PostgreSQL for relational data with JSON support
- **Cache Layer**: Redis for sessions, job queues, and real-time data
- **Search Engine**: Elasticsearch or built-in full-text search

**Frontend Options**:
- **React/Next.js**: Server-side rendering, excellent ecosystem, TypeScript support
- **Vue.js/Nuxt.js**: Progressive framework, good developer experience
- **Svelte/SvelteKit**: Minimal runtime, excellent performance

### 10.2 Development Approach

**Phase 1 (Months 1-2): Core Foundation**
- User authentication with Spotify integration
- Basic artist and show CRUD operations
- Database schema and API foundation
- Basic search functionality

**Phase 2 (Months 3-4): Import System**  
- Multi-phase artist import implementation
- External API integrations (Spotify, Ticketmaster)
- Background job queue system
- Progress tracking and real-time updates

**Phase 3 (Months 5-6): Collaboration Features**
- Setlist creation and editing
- Real-time WebSocket implementation
- Voting system with conflict resolution
- Mobile optimization and PWA features

**Phase 4 (Months 7-8): Polish & Deploy**
- Email notification system
- Performance optimization
- Security hardening
- Production deployment and monitoring

### 10.3 Success Metrics

**Core Engagement**:
- Daily and monthly active users
- Artist import completion rates
- Setlist collaboration participation
- User retention at 1, 7, and 30 days

**Feature Adoption**:
- Artist following rates
- Setlist voting participation
- Real-time collaboration usage
- Mobile vs desktop usage patterns

**System Performance**:
- Artist import success rates and timing
- API response times and availability
- WebSocket connection stability
- Email delivery rates and engagement

---

## Conclusion

The Set focuses on four core activities that provide immediate value to music fans: discovering artists, tracking their activities, voting on setlist accuracy, and sharing the experience with others.

The key technical differentiator is the multi-phase artist import system that provides instant user feedback while comprehensively importing data in the background. Combined with real-time setlist collaboration and community voting, this creates a unique platform for live music engagement.

Success depends on:
- Seamless external API integration with proper rate limiting
- Real-time collaboration that works reliably in concert venues  
- Mobile-optimized experience for live music environments
- Reliable background job processing for data synchronization
- Simple, focused user experience without feature bloat

This PRD provides the essential requirements for building The Set platform while maintaining focus on the core user value and technical challenges.