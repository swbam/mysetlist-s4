/**
 * Unit Tests for Retry Logic and HTTP Utilities
 * Tests fetchJson retry wrapper, exponential backoff, and error handling
 * Validates GROK.md retry requirements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson } from '../../lib/services/util/http';
import { pLimit, processBatch } from '../../lib/services/util/concurrency';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Retry Logic and HTTP Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fetchJson retry wrapper', () => {
    it('should succeed on first attempt when request is successful', async () => {
      const mockResponse = { data: 'success' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchJson('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should retry on 429 (rate limit) errors', async () => {
      const mockResponse = { data: 'success' };
      
      // First two calls fail with 429
      mockFetch
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        });

      const promise = fetchJson('https://api.example.com/test', {}, { tries: 3, baseDelay: 100 });

      // Fast-forward through retries
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockResponse);
    });

    it('should retry on 5xx server errors', async () => {
      const mockResponse = { data: 'success' };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          text: () => Promise.resolve('Bad Gateway'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse),
        });

      const promise = fetchJson('https://api.example.com/test', {}, { tries: 3, baseDelay: 100 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockResponse);
    });

    it('should NOT retry on 4xx client errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });

      await expect(
        fetchJson('https://api.example.com/test', {}, { tries: 3, baseDelay: 100 })
      ).rejects.toThrow('HTTP 404: Not Found');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should implement exponential backoff with jitter', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout to capture delays
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately
      }) as any;

      mockFetch
        .mockRejectedValueOnce(new Error('HTTP 500'))
        .mockRejectedValueOnce(new Error('HTTP 500'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });

      await fetchJson('https://api.example.com/test', {}, { tries: 3, baseDelay: 400 });

      // Verify exponential backoff pattern (with jitter)
      expect(delays).toHaveLength(2);
      expect(delays[0]).toBeGreaterThanOrEqual(400); // First retry: 400ms base + jitter
      expect(delays[0]).toBeLessThan(1000); // Should be less than 400 * 2 + max jitter
      expect(delays[1]).toBeGreaterThanOrEqual(800); // Second retry: 800ms base + jitter
      expect(delays[1]).toBeLessThan(2000); // Should be less than 800 * 2 + max jitter

      global.setTimeout = originalSetTimeout;
    });

    it('should throw error after exhausting all retries', async () => {
      mockFetch.mockRejectedValue(new Error('HTTP 500'));

      await expect(
        fetchJson('https://api.example.com/test', {}, { tries: 3, baseDelay: 100 })
      ).rejects.toThrow('HTTP 500');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use default retry configuration', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('HTTP 500'))
        .mockRejectedValueOnce(new Error('HTTP 500'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });

      const promise = fetchJson('https://api.example.com/test');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3); // Default tries = 3
      expect(result).toEqual({ success: true });
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(
        fetchJson('https://api.example.com/test', {}, { tries: 2 })
      ).rejects.toThrow('Invalid JSON');

      expect(mockFetch).toHaveBeenCalledTimes(2); // Should retry on JSON parse error
    });

    it('should preserve request headers and body', async () => {
      const headers = { 'Authorization': 'Bearer token' };
      const body = JSON.stringify({ test: 'data' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await fetchJson('https://api.example.com/test', {
        method: 'POST',
        headers,
        body,
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'POST',
        headers,
        body,
      });
    });
  });

  describe('Concurrency Control', () => {
    describe('pLimit', () => {
      it('should limit concurrent operations', async () => {
        let activeCount = 0;
        let maxActive = 0;
        const limit = pLimit(2);

        const mockOperation = () => {
          activeCount++;
          maxActive = Math.max(maxActive, activeCount);
          
          return new Promise(resolve => {
            setTimeout(() => {
              activeCount--;
              resolve(`result-${activeCount + 1}`);
            }, 100);
          });
        };

        const promises = Array(5).fill(null).map(() => limit(mockOperation));

        vi.advanceTimersByTime(500);
        await Promise.all(promises);

        expect(maxActive).toBe(2); // Should never exceed limit
      });

      it('should queue operations when limit is reached', async () => {
        const executionOrder: number[] = [];
        const limit = pLimit(1);

        const createOperation = (id: number) => () => {
          executionOrder.push(id);
          return Promise.resolve(id);
        };

        const promises = [
          limit(createOperation(1)),
          limit(createOperation(2)),
          limit(createOperation(3)),
        ];

        await Promise.all(promises);

        expect(executionOrder).toEqual([1, 2, 3]); // Should execute in order
      });

      it('should handle operation failures gracefully', async () => {
        const limit = pLimit(2);
        let successCount = 0;

        const successOperation = () => {
          successCount++;
          return Promise.resolve('success');
        };

        const failOperation = () => Promise.reject(new Error('fail'));

        const promises = [
          limit(successOperation),
          limit(failOperation),
          limit(successOperation),
        ];

        const results = await Promise.allSettled(promises);

        expect(successCount).toBe(2);
        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('rejected');
        expect(results[2].status).toBe('fulfilled');
      });
    });

    describe('processBatch', () => {
      it('should process items in controlled batches', async () => {
        const items = [1, 2, 3, 4, 5];
        const results: number[] = [];
        
        const processor = async (item: number) => {
          results.push(item * 2);
          return item * 2;
        };

        await processBatch(items, processor, {
          concurrency: 2,
          continueOnError: false,
        });

        expect(results).toHaveLength(5);
        expect(results.sort()).toEqual([2, 4, 6, 8, 10]);
      });

      it('should report progress during processing', async () => {
        const items = [1, 2, 3, 4];
        const progressUpdates: Array<{ completed: number; total: number }> = [];
        
        const processor = async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return item;
        };

        const promise = processBatch(items, processor, {
          concurrency: 2,
          onProgress: (completed, total) => {
            progressUpdates.push({ completed, total });
          },
        });

        vi.advanceTimersByTime(100);
        await promise;

        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates[progressUpdates.length - 1]).toEqual({ completed: 4, total: 4 });
      });

      it('should continue on errors when configured', async () => {
        const items = [1, 2, 3, 4];
        const results: number[] = [];
        const errors: Error[] = [];
        
        const processor = async (item: number) => {
          if (item === 2) {
            throw new Error(`Failed on item ${item}`);
          }
          results.push(item);
          return item;
        };

        await processBatch(items, processor, {
          concurrency: 1,
          continueOnError: true,
          onError: (error, item) => {
            errors.push(error);
          },
        });

        expect(results).toEqual([1, 3, 4]);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Failed on item 2');
      });

      it('should stop on first error when configured', async () => {
        const items = [1, 2, 3, 4];
        const results: number[] = [];
        
        const processor = async (item: number) => {
          if (item === 2) {
            throw new Error(`Failed on item ${item}`);
          }
          results.push(item);
          return item;
        };

        await expect(
          processBatch(items, processor, {
            concurrency: 1,
            continueOnError: false,
          })
        ).rejects.toThrow('Failed on item 2');

        expect(results).toEqual([1]); // Should stop after first item and before error
      });
    });
  });

  describe('Integration: API Call Patterns', () => {
    it('should handle Spotify batch operations with retries', async () => {
      const trackIds = ['1', '2', '3', '4', '5'];
      const batchSize = 2;
      const responses = [
        { tracks: [{ id: '1' }, { id: '2' }] },
        { tracks: [{ id: '3' }, { id: '4' }] },
        { tracks: [{ id: '5' }] },
      ];

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        const response = responses[callCount++];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
        });
      });

      const allTracks: any[] = [];
      
      // Simulate Spotify batch processing
      for (let i = 0; i < trackIds.length; i += batchSize) {
        const batch = trackIds.slice(i, i + batchSize);
        const url = `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`;
        
        const data = await fetchJson(url, {
          headers: { Authorization: 'Bearer token' },
        });
        
        allTracks.push(...(data.tracks || []));
      }

      expect(allTracks).toHaveLength(5);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(allTracks.map(t => t.id)).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should handle Ticketmaster pagination with retries', async () => {
      const pages = [
        { 
          _embedded: { events: [{ id: 'event1' }, { id: 'event2' }] },
          page: { totalPages: 3, number: 0 }
        },
        { 
          _embedded: { events: [{ id: 'event3' }, { id: 'event4' }] },
          page: { totalPages: 3, number: 1 }
        },
        { 
          _embedded: { events: [{ id: 'event5' }] },
          page: { totalPages: 3, number: 2 }
        },
      ];

      let pageRequests = 0;
      mockFetch.mockImplementation((url: string) => {
        const urlObj = new URL(url);
        const page = parseInt(urlObj.searchParams.get('page') || '0');
        
        // Simulate failure on second page first attempt
        if (page === 1 && pageRequests === 1) {
          pageRequests++;
          return Promise.reject(new Error('HTTP 500'));
        }
        
        pageRequests++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(pages[page]),
        });
      });

      const allEvents: any[] = [];
      let page = 0;
      let totalPages = 1;

      // Simulate paginated fetching
      while (page < totalPages) {
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=test&size=200&page=${page}&apikey=key`;
        
        const promise = fetchJson(url, {}, { tries: 3, baseDelay: 100 });
        await vi.runAllTimersAsync();
        const data = await promise;

        totalPages = data?.page?.totalPages ?? 0;
        const events = data?._embedded?.events ?? [];
        
        allEvents.push(...events);
        page++;
      }

      expect(allEvents).toHaveLength(5);
      expect(allEvents.map(e => e.id)).toEqual(['event1', 'event2', 'event3', 'event4', 'event5']);
      expect(pageRequests).toBeGreaterThan(3); // Should include retry
    });

    it('should handle rate limiting gracefully', async () => {
      let requestCount = 0;
      const rateLimitReset = Date.now() + 60000; // 1 minute from now

      mockFetch.mockImplementation(() => {
        requestCount++;
        
        if (requestCount <= 2) {
          // Simulate rate limit
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: {
              get: (name: string) => {
                if (name === 'X-RateLimit-Reset') return rateLimitReset.toString();
                return null;
              }
            },
            text: () => Promise.resolve('Rate limit exceeded'),
          });
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });
      });

      const promise = fetchJson('https://api.example.com/test', {}, { tries: 3, baseDelay: 100 });
      
      // Fast-forward through rate limit backoff
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(requestCount).toBe(3); // Initial + 2 retries
    });
  });
});