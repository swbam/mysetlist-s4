# MySetlist Application: Path to 100% Completion

## 1. Introduction

This document outlines the necessary steps to bring the MySetlist application from its current 80% state to a fully functional, production-ready 100%. It is based on a thorough review of the project's documentation, codebase, and Supabase infrastructure.

The primary issues to be addressed are:
*   Inefficient and incomplete search functionality.
*   Failures in the creation of setlists when shows are created.
*   An inconsistent and incomplete data import pipeline for artists, shows, and song catalogs.

This document provides a detailed, actionable plan for a developer to resolve these issues and complete the application.

## 2. User and Data Flow Overview

This section details the end-to-end user experience and the corresponding background data synchronization process. The primary goal is a seamless, non-blocking UI where data is imported on-demand.

### The User Journey

1.  **Search Initiation**: The user types an artist's name into a search bar on the application.
2.  **Real-time Search Results**: The UI immediately displays a list of matching artists fetched in real-time from the **Ticketmaster API**. The local database is **not** queried for artists at this stage. The results appear in a popover directly below the search bar.
3.  **Artist Selection**: The user clicks on an artist from the search results.
4.  **Instant Navigation & Background Trigger**:
    *   The application **instantly** navigates the user to the artist's page (e.g., `/artists/the-strokes`). The page initially displays a skeleton UI or loading state.
    *   Simultaneously and invisibly, the frontend sends a request to a dedicated API endpoint (e.g., `/api/sync/artist`) with the selected artist's identifier (e.g., Ticketmaster ID).
5.  **Asynchronous Data Import**: The API endpoint triggers a master orchestration Edge Function (`sync-artist-data`) on Supabase. This function runs entirely in the background, and the API endpoint immediately returns a `202 Accepted` response to the frontend, ensuring the UI is not blocked.
6.  **Live Page Updates**: The artist page is subscribed to real-time updates from Supabase. As the background import process populates the database, the page dynamically updates, replacing the skeleton loaders with the artist's details, song catalog, and show list.

### The Data Synchronization Workflow (in `sync-artist-data` Edge Function)

The background import process must execute in the following strict order to ensure data integrity:

1.  **Step 1: Sync Artist Core Details**:
    *   The function fetches detailed artist information from the **Spotify API**.
    *   It then `upserts` this data into the `artists` table in your database. This single record is the foundation for all subsequent data.

2.  **Step 2: Sync Full Song Catalog**:
    *   Once the artist record exists, the function calls the `sync-song-catalog` logic.
    *   This process paginates through all of the artist's albums and tracks on Spotify and `upserts` each song into the `songs` table, linking each song to the artist's ID. This must complete before the next step.

3.  **Step 3: Sync Shows and Venues**:
    *   With the artist and their songs in the database, the function fetches all upcoming shows for the artist from the **Ticketmaster API**.
    *   For each show, it first `upserts` the venue information into the `venues` table, then `upserts` the show information into the `shows` table, creating the link to the artist and venue records.

4.  **Step 4: Create Default "Predicted" Setlists**:
    *   For each **newly created** show from the previous step, the function calls the `create_default_setlist` RPC function in the database.
    *   This function creates a new "predicted" setlist and populates it with 5 random songs from the artist's catalog, which was imported in Step 2.

This orchestrated, on-demand workflow ensures a fast user experience while building a rich, accurate, and correctly structured dataset in your database.

## 3. High-Level Action Plan

- [ ] **Phase 1: Database and Backend Refactoring**
    - [ ] Refactor the data synchronization Edge Functions to ensure a consistent and correct data import flow.
    - [ ] Implement a robust, full-text search capability in the database.
    - [ ] Correct the setlist creation logic to align with the database schema.
- [ ] **Phase 2: API and Frontend Integration**
    - [ ] Update the application's API routes to use the new, efficient search functions.
    - [ ] Ensure the frontend components correctly display the complete and accurate data.
- [ ] **Phase 3: Testing and Optimization**
    - [ ] Implement a comprehensive testing suite for the data synchronization process.
    - [ ] Review and optimize all cron jobs for efficiency and reliability.
    - [ ] Conduct a final performance and security audit.

## 3. Detailed Breakdown of Issues and Solutions

### 3.1. Search, On-Demand Import, and User Experience

**Problem Statement**: The artist search and import process is not user-friendly. It should provide instant, real-time results from Ticketmaster, trigger a comprehensive background import when a new artist is selected, and maintain a consistent, non-blocking UI.

**Root Cause Analysis**:
*   **Incorrect Search Target**: The current implementation searches the local database for artists instead of the Ticketmaster API.
*   **Lack of a Cohesive Workflow**: The design does not connect the search, import, and page navigation into a single, fluid user experience.
*   **Inconsistent UI**: The search UI behavior is not standardized across the application.

**Implementation Plan**:

1.  **Standardize the Frontend Search Component (`SearchBox.tsx`)**:
    *   Ensure the `SearchBox` component (defined in `04-core-features-and-components.md`) is used consistently for all search inputs (artists, shows, venues).
    *   The component must display results in a popover/dropdown directly below the input field.
    *   Selecting a result must navigate the user directly to the corresponding page (e.g., `/artists/[slug]`). There should be **no** intermediate search results page.
    *   The search results must **not** display an "Import" button or text. The import is an implicit background action.

2.  **Refactor the Search API Route (`/api/search/route.ts`)**:
    *   **Artist Search**: When the search type is `artist`, the API must call the Ticketmaster API's "attractions" endpoint for real-time results.
    *   **Local Data Search**: For `venue` and `show` searches, the API will query the local database using optimized full-text search indexes.

3.  **Implement the On-Demand, Asynchronous Import Trigger**:
    *   When a user selects an artist from the Ticketmaster search results, the frontend must perform two actions simultaneously:
        1.  **Navigate Immediately**: Instantly navigate the user to the artist's page (`/artists/[slug]`).
        2.  **Trigger Background Sync**: Make an API call to a new endpoint (e.g., `/api/sync/artist`) that invokes the `sync-artist-data` orchestration Edge Function (detailed in section 3.3). This process must run entirely in the background.

4.  **Implement Optimistic UI and Real-time Updates**:
    *   The artist page (`/artists/[slug]`) must handle a loading state, displaying a skeleton UI while waiting for data.
    *   The page must subscribe to Supabase Realtime updates for the `artists`, `shows`, and `songs` tables (filtered by the `artist_id`).
    *   As the background sync populates the database, the page will automatically update with the new information, creating a live and dynamic user experience.
    *   A subtle UI element (e.g., a small notification) should inform the user that the artist's data is being synced.

### 3.2. Setlist Creation and Defaulting

**Problem Statement**: Setlists are not being created correctly, and there is no default "predicted" setlist when a new show is imported.

**Root Cause Analysis**:
*   **Incorrect Data Storage**: The `sync-setlists` Edge Function stores songs as a JSON blob, which is incompatible with the relational schema.
*   **Missing Defaulting Logic**: The import process does not include a step for creating a default setlist.

**Implementation Plan**:

1.  **Create a Database Function for Default Setlists**:
    *   Create a new RPC function in Supabase, `create_default_setlist`, that takes a `show_id` and `artist_id` as input.
    *   This function will select 5 random songs from the artist's catalog and create a new "predicted" setlist.

    ```sql
    -- In a new migration file
    CREATE OR REPLACE FUNCTION create_default_setlist(show_id_param uuid, artist_id_param uuid)
    RETURNS void AS $$
    DECLARE
        new_setlist_id uuid;
        random_song_id uuid;
    BEGIN
        -- Create the main setlist record
        INSERT INTO setlists (show_id, artist_id, type, name)
        VALUES (show_id_param, artist_id_param, 'predicted', 'Predicted Setlist')
        RETURNING id INTO new_setlist_id;

        -- Add 5 random songs
        FOR i IN 1..5 LOOP
            SELECT id INTO random_song_id FROM songs
            WHERE artist_id = artist_id_param -- Note: This requires adding an `artist_id` to the `songs` table
            ORDER BY RANDOM()
            LIMIT 1;

            IF random_song_id IS NOT NULL THEN
                INSERT INTO setlist_songs (setlist_id, song_id, position)
                VALUES (new_setlist_id, random_song_id, i);
            END IF;
        END LOOP;
    END;
    $$ LANGUAGE plpgsql;
    ```
    *   **Note**: This will require adding an `artist_id` foreign key to the `songs` table to enable efficient lookup of an artist's songs.

2.  **Integrate Default Setlist Creation into the Import Flow**:
    *   The `sync-artist-data` orchestration function should call this new `create_default_setlist` RPC function for each new show that is imported.

3.  **Refactor the `sync-setlists` Edge Function**:
    *   This function should still be used for importing *actual* setlists from Setlist.fm.
    *   It must be refactored to correctly create records in the `songs` and `setlist_songs` tables, as detailed in the original plan.

### 3.3. Data Import Orchestration

**Problem Statement**: The data import process is fragmented and does not follow a logical, user-centric workflow.

**Root Cause Analysis**:
*   **Lack of Orchestration**: The sync functions are standalone and are not called in a coordinated sequence.
*   **Incomplete Artist Creation**: The `sync-shows` function creates a minimal artist record without triggering a full data sync.

**Implementation Plan**:

1.  **Create a Unified Orchestration Edge Function (`sync-artist-data`)**:
    *   This function will be the single entry point for importing all data related to an artist. It will be an asynchronous, background job.
    *   It must execute the following steps in order:
        1.  **Sync Artist**: Call the `sync-artists` function to create or update the artist's core details from Spotify.
        2.  **Sync Song Catalog**: Call the `sync-song-catalog` function to import the artist's entire discography. This must complete before the next step.
        3.  **Sync Shows**: Call a consolidated `sync-shows` function to import all of the artist's upcoming shows from Ticketmaster.
        4.  **Create Default Setlists**: For each newly created show, call the `create_default_setlist` RPC function.

2.  **Consolidate Show Sync Functions**:
    *   Refactor the various show sync functions (`sync-shows`, `sync-ticketmaster-shows`, `sync-artist-shows`) into a single, reliable function that takes an `artist_id` as input and imports all of their shows.

3.  **Update Frontend Trigger**:
    *   The API route called by the frontend after an artist search result is clicked will invoke this new `sync-artist-data` function.

### 3.4. Song Catalogs Aren't Being Imported Completely

**Problem Statement**: Only an artist's top tracks are being imported, not their full song catalog.

**Root Cause Analysis**:
*   **Incorrect Function Usage**: The main `sync-artists` function only fetches top tracks. The `sync-song-catalog` function, which is designed for this purpose, is not being used in the main workflow.

**Implementation Plan**:

1.  **Integrate `sync-song-catalog`**:
    *   As described in the previous section, the new `sync-artist-data` orchestration function will be responsible for calling `sync-song-catalog` after an artist has been created or updated. This will ensure that the full song catalog is always imported.


## 4. System-Wide Improvements

*   **Consolidate Redundant Functions**:
    *   There are multiple functions for syncing shows (`sync-shows`, `sync-ticketmaster-shows`, `sync-artist-shows`). These should be reviewed and consolidated into a single, reliable function.
*   **Strengthen Database Constraints**:
    *   Review the database schema and add any missing foreign key constraints to ensure data integrity. The `optimize_constraints_for_data_imports` migration is a good start, but a full audit is recommended.
*   **Implement Comprehensive Testing**:
    *   Create a suite of tests (e.g., using Deno's built-in test runner) for the Edge Functions. These tests should mock the external APIs and verify that the database is updated correctly.
*   **Review and Optimize Cron Jobs**:
    *   Ensure that the `scheduled-sync` function is calling the new orchestration logic and that the schedule is appropriate for the rate limits of the external APIs.

## 5. Conclusion

By following this plan, you will address the root causes of the current issues and establish a robust, scalable, and reliable data synchronization pipeline. The result will be a complete and accurate dataset that will power a fast, functional, and engaging user experience, bringing your application to 100% completion.
