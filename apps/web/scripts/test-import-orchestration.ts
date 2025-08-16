#!/usr/bin/env tsx

/**
 * Complete 4-Phase Import Orchestration Test
 * Tests the full GROK.md import system with real artists to ensure everything works
 */

import { performance } from 'perf_hooks';
const EventSource = require('eventsource'); // Node.js EventSource polyfill

const BASE_URL = 'http://localhost:3001';

interface PhaseMetrics {
  name: string;
  startTime: number;
  duration?: number;
  success: boolean;
  error?: string;
  data?: any;
}

interface ImportTestResult {
  artistId: string;
  slug: string;
  phases: PhaseMetrics[];
  totalDuration: number;
  success: boolean;
  stats?: {
    songsImported: number;
    showsImported: number;
    venuesImported: number;
  };
}

class ImportOrchestrationTester {
  private metrics: PhaseMetrics[] = [];
  
  async testCompleteImport(artistName: string): Promise<ImportTestResult> {
    console.log(`\n🎵 Testing complete 4-phase import for: ${artistName}`);
    const testStartTime = performance.now();
    
    try {
      // Step 1: Find Ticketmaster attraction ID
      const attractionId = await this.findAttractionId(artistName);
      
      // Step 2: Phase 1 - Identity/Bootstrap (< 200ms target)
      const { artistId, slug } = await this.testPhase1(attractionId);
      
      // Step 3: Phases 2-4 - Full import via SSE stream
      const importStats = await this.testFullImportStream(artistId);
      
      // Step 4: Validate results
      await this.validateImportResults(artistId);
      
      const totalDuration = performance.now() - testStartTime;
      
      return {
        artistId,
        slug,
        phases: this.metrics,
        totalDuration,
        success: true,
        stats: importStats,
      };
      
    } catch (error) {
      const totalDuration = performance.now() - testStartTime;
      console.error('❌ Import test failed:', error);
      
      return {
        artistId: '',
        slug: '',
        phases: this.metrics,
        totalDuration,
        success: false,
      };
    }
  }
  
  private async findAttractionId(artistName: string): Promise<string> {
    const phase: PhaseMetrics = {
      name: 'Find Attraction ID',
      startTime: performance.now(),
      success: false,
    };
    
    try {
      console.log(`🔍 Searching for ${artistName} on Ticketmaster...`);
      
      const encodedName = encodeURIComponent(artistName);
      const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodedName}&apikey=${process.env.TICKETMASTER_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      const attraction = data._embedded?.attractions?.[0];
      if (!attraction) {
        throw new Error(`No attraction found for: ${artistName}`);
      }
      
      console.log(`✅ Found attraction: ${attraction.name} (ID: ${attraction.id})`);
      
      phase.success = true;
      phase.data = { id: attraction.id, name: attraction.name };
      phase.duration = performance.now() - phase.startTime;
      
      this.metrics.push(phase);
      return attraction.id;
      
    } catch (error) {
      phase.error = error instanceof Error ? error.message : 'Unknown error';
      phase.duration = performance.now() - phase.startTime;
      this.metrics.push(phase);
      throw error;
    }
  }
  
  private async testPhase1(tmAttractionId: string): Promise<{ artistId: string; slug: string }> {
    const phase: PhaseMetrics = {
      name: 'Phase 1: Identity/Bootstrap',
      startTime: performance.now(),
      success: false,
    };
    
    try {
      console.log('🚀 Testing Phase 1: Identity/Bootstrap (< 200ms target)...');
      
      const response = await fetch(`${BASE_URL}/api/artists/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmAttractionId }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }
      
      const result = await response.json();
      phase.duration = performance.now() - phase.startTime;
      
      console.log(`✅ Phase 1 completed in ${phase.duration.toFixed(1)}ms`);
      console.log(`   Artist ID: ${result.artistId}`);
      console.log(`   Slug: ${result.slug}`);
      
      // Validate < 200ms requirement
      if (phase.duration > 200) {
        console.warn(`⚠️  Phase 1 took ${phase.duration.toFixed(1)}ms (target: < 200ms)`);
      }
      
      phase.success = true;
      phase.data = result;
      this.metrics.push(phase);
      
      return result;
      
    } catch (error) {
      phase.error = error instanceof Error ? error.message : 'Unknown error';
      phase.duration = performance.now() - phase.startTime;
      this.metrics.push(phase);
      throw error;
    }
  }
  
  private async testFullImportStream(artistId: string): Promise<any> {
    const phase: PhaseMetrics = {
      name: 'Phases 2-4: Full Import Stream',
      startTime: performance.now(),
      success: false,
    };
    
    try {
      console.log('📡 Testing SSE import stream for phases 2-4...');
      
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${BASE_URL}/api/artists/${artistId}/stream`);
        let lastProgress = 0;
        let finalStats: any = null;
        
        const timeout = setTimeout(() => {
          eventSource.close();
          reject(new Error('Import timeout after 5 minutes'));
        }, 5 * 60 * 1000); // 5 minute timeout
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Log progress updates
            if (data.progress !== lastProgress) {
              console.log(`   Progress: ${data.progress}% - ${data.message}`);
              lastProgress = data.progress;
            }
            
            // Handle completion
            if (data.stage === 'completed') {
              clearTimeout(timeout);
              eventSource.close();
              
              phase.duration = performance.now() - phase.startTime;
              phase.success = true;
              phase.data = data;
              this.metrics.push(phase);
              
              console.log(`✅ Full import completed in ${(phase.duration / 1000).toFixed(1)}s`);
              finalStats = data.metadata?.stats;
              resolve(finalStats);
            }
            
            // Handle failure
            if (data.stage === 'failed') {
              clearTimeout(timeout);
              eventSource.close();
              
              phase.duration = performance.now() - phase.startTime;
              phase.error = data.error || data.message;
              this.metrics.push(phase);
              
              reject(new Error(`Import failed: ${data.error || data.message}`));
            }
            
          } catch (parseError) {
            console.error('Failed to parse SSE data:', event.data);
          }
        };
        
        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          eventSource.close();
          
          phase.duration = performance.now() - phase.startTime;
          phase.error = 'SSE connection error';
          this.metrics.push(phase);
          
          reject(new Error('SSE connection failed'));
        };
      });
      
    } catch (error) {
      phase.error = error instanceof Error ? error.message : 'Unknown error';
      phase.duration = performance.now() - phase.startTime;
      this.metrics.push(phase);
      throw error;
    }
  }
  
  private async validateImportResults(artistId: string): Promise<void> {
    const phase: PhaseMetrics = {
      name: 'Validation',
      startTime: performance.now(),
      success: false,
    };
    
    try {
      console.log('🔍 Validating import results...');
      
      // Check artist exists and has complete data
      const artistResponse = await fetch(`${BASE_URL}/api/artists/${artistId}`);
      if (!artistResponse.ok) {
        throw new Error('Artist not found after import');
      }
      
      const artist = await artistResponse.json();
      
      // Validate artist data
      const validations = [
        { check: artist.name && artist.name !== 'Loading...', message: 'Artist has real name' },
        { check: artist.slug && !artist.slug.startsWith('tm-'), message: 'Artist has proper slug' },
        { check: artist.importStatus === 'completed', message: 'Import status is completed' },
        { check: artist.totalSongs > 0, message: `Has songs (${artist.totalSongs})` },
      ];
      
      let allValid = true;
      for (const validation of validations) {
        if (validation.check) {
          console.log(`   ✅ ${validation.message}`);
        } else {
          console.log(`   ❌ ${validation.message}`);
          allValid = false;
        }
      }
      
      if (!allValid) {
        throw new Error('Validation checks failed');
      }
      
      phase.duration = performance.now() - phase.startTime;
      phase.success = true;
      phase.data = { artist, validations };
      this.metrics.push(phase);
      
      console.log('✅ All validation checks passed');
      
    } catch (error) {
      phase.error = error instanceof Error ? error.message : 'Unknown error';
      phase.duration = performance.now() - phase.startTime;
      this.metrics.push(phase);
      throw error;
    }
  }
  
  printReport(result: ImportTestResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT ORCHESTRATION TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Overall Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`⏱️  Total Duration: ${(result.totalDuration / 1000).toFixed(2)}s`);
    
    if (result.stats) {
      console.log('\n📈 Import Statistics:');
      console.log(`   Songs Imported: ${result.stats.songsImported}`);
      console.log(`   Shows Imported: ${result.stats.showsImported}`);
      console.log(`   Venues Imported: ${result.stats.venuesImported}`);
    }
    
    console.log('\n⏳ Phase Breakdown:');
    for (const phase of result.phases) {
      const status = phase.success ? '✅' : '❌';
      const duration = phase.duration ? `${phase.duration.toFixed(1)}ms` : 'N/A';
      console.log(`   ${status} ${phase.name}: ${duration}`);
      if (phase.error) {
        console.log(`      Error: ${phase.error}`);
      }
    }
    
    // Performance analysis
    console.log('\n📊 Performance Analysis:');
    const phase1 = result.phases.find(p => p.name.includes('Phase 1'));
    if (phase1?.duration) {
      const meetsTarget = phase1.duration <= 200;
      console.log(`   Phase 1 (target < 200ms): ${phase1.duration.toFixed(1)}ms ${meetsTarget ? '✅' : '⚠️'}`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Test execution
async function main() {
  if (!process.env.TICKETMASTER_API_KEY) {
    console.error('❌ TICKETMASTER_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const tester = new ImportOrchestrationTester();
  
  // Test with "Our Last Night" as requested
  const result = await tester.testCompleteImport('Our Last Night');
  tester.printReport(result);
  
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { ImportOrchestrationTester };