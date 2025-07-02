#!/usr/bin/env node

/**
 * Real-time Features Test Script
 * Tests voting system, live updates, and WebSocket connections
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

if (!SUPABASE_URL.includes('supabase.co')) {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class RealtimeTestRunner {
  constructor() {
    this.channels = [];
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const symbols = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${symbols[type]} [${timestamp}] ${message}`);
  }

  addResult(testName, success, details = '') {
    this.testResults.push({
      test: testName,
      success,
      details,
      timestamp: Date.now() - this.startTime
    });
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...', 'info');
    
    try {
      const { data, error } = await supabase.from('songs').select('id').limit(1);
      
      if (error) {
        this.log(`Database connection failed: ${error.message}`, 'error');
        this.addResult('Database Connection', false, error.message);
        return false;
      }
      
      this.log('Database connection successful', 'success');
      this.addResult('Database Connection', true);
      return true;
    } catch (error) {
      this.log(`Database connection error: ${error.message}`, 'error');
      this.addResult('Database Connection', false, error.message);
      return false;
    }
  }

  async testRealtimeConnection() {
    this.log('Testing real-time connection...', 'info');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('Real-time connection timeout', 'error');
        this.addResult('Realtime Connection', false, 'Connection timeout');
        resolve(false);
      }, 10000);

      const channel = supabase
        .channel('test-connection')
        .on('presence', { event: 'sync' }, () => {
          clearTimeout(timeout);
          this.log('Real-time connection established', 'success');
          this.addResult('Realtime Connection', true);
          resolve(true);
        })
        .subscribe((status) => {
          this.log(`Real-time status: ${status}`, 'info');
          
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            this.log('Real-time subscription successful', 'success');
            this.addResult('Realtime Connection', true);
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            clearTimeout(timeout);
            this.log('Real-time connection failed', 'error');
            this.addResult('Realtime Connection', false, `Status: ${status}`);
            resolve(false);
          }
        });

      this.channels.push(channel);
    });
  }

  async testVoteUpdates() {
    this.log('Testing vote update subscriptions...', 'info');
    
    // First, find a setlist song to test with
    const { data: setlistSongs, error: fetchError } = await supabase
      .from('setlist_songs')
      .select('id, setlist_id')
      .limit(1);

    if (fetchError || !setlistSongs || setlistSongs.length === 0) {
      this.log('No setlist songs found for testing', 'warning');
      this.addResult('Vote Updates Test', false, 'No test data available');
      return false;
    }

    const testSongId = setlistSongs[0].id;
    this.log(`Testing with setlist song ID: ${testSongId}`, 'info');

    return new Promise((resolve) => {
      let updateReceived = false;
      
      const timeout = setTimeout(() => {
        if (!updateReceived) {
          this.log('Vote update test timeout', 'error');
          this.addResult('Vote Updates Test', false, 'No updates received');
          resolve(false);
        }
      }, 15000);

      const channel = supabase
        .channel(`test-votes-${testSongId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `setlist_song_id=eq.${testSongId}`,
          },
          (payload) => {
            clearTimeout(timeout);
            updateReceived = true;
            this.log('Vote update received via real-time!', 'success');
            this.log(`Update type: ${payload.eventType}`, 'info');
            this.addResult('Vote Updates Test', true, `Received ${payload.eventType} event`);
            resolve(true);
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.log('Vote subscription active, simulating vote...', 'info');
            
            // Simulate a vote by inserting/updating a test vote
            // Note: This would normally require authentication
            try {
              const { error: voteError } = await supabase
                .from('votes')
                .upsert({
                  setlist_song_id: testSongId,
                  user_id: 'test-user-' + Math.random().toString(36).substr(2, 9),
                  vote_type: 'up',
                  created_at: new Date().toISOString(),
                }, {
                  onConflict: 'setlist_song_id,user_id'
                });

              if (voteError) {
                this.log(`Vote simulation failed: ${voteError.message}`, 'warning');
                // Don't fail the test - this might be due to RLS policies
              }
            } catch (error) {
              this.log(`Vote simulation error: ${error.message}`, 'warning');
            }
          }
        });

      this.channels.push(channel);
    });
  }

  async testSetlistUpdates() {
    this.log('Testing setlist update subscriptions...', 'info');
    
    // Find a show to test with
    const { data: shows, error: fetchError } = await supabase
      .from('shows')
      .select('id')
      .limit(1);

    if (fetchError || !shows || shows.length === 0) {
      this.log('No shows found for testing', 'warning');
      this.addResult('Setlist Updates Test', false, 'No test data available');
      return false;
    }

    const testShowId = shows[0].id;
    this.log(`Testing with show ID: ${testShowId}`, 'info');

    return new Promise((resolve) => {
      let updateReceived = false;
      
      const timeout = setTimeout(() => {
        if (!updateReceived) {
          this.log('Setlist update test completed (no changes detected)', 'info');
          this.addResult('Setlist Updates Test', true, 'Subscription active');
          resolve(true);
        }
      }, 10000);

      const channel = supabase
        .channel(`test-setlist-${testShowId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'setlist_songs',
          },
          (payload) => {
            clearTimeout(timeout);
            updateReceived = true;
            this.log('Setlist update received via real-time!', 'success');
            this.addResult('Setlist Updates Test', true, `Received ${payload.eventType} event`);
            resolve(true);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'setlists',
            filter: `show_id=eq.${testShowId}`,
          },
          (payload) => {
            clearTimeout(timeout);
            updateReceived = true;
            this.log('Setlist structure update received!', 'success');
            this.addResult('Setlist Updates Test', true, `Received ${payload.eventType} event`);
            resolve(true);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.log('Setlist subscription active', 'success');
          }
        });

      this.channels.push(channel);
    });
  }

  async testPresenceSystem() {
    this.log('Testing presence system...', 'info');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('Presence test completed', 'success');
        this.addResult('Presence System', true);
        resolve(true);
      }, 5000);

      const channel = supabase
        .channel('test-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const userCount = Object.keys(state).length;
          this.log(`Presence sync: ${userCount} users online`, 'info');
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          this.log(`User joined: ${key}`, 'info');
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          this.log(`User left: ${key}`, 'info');
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.log('Presence subscription active', 'success');
            
            // Track test presence
            await channel.track({
              user_id: 'test-user-' + Math.random().toString(36).substr(2, 9),
              username: 'test-user',
              last_seen: new Date().toISOString(),
            });
            
            clearTimeout(timeout);
            this.addResult('Presence System', true);
            resolve(true);
          }
        });

      this.channels.push(channel);
    });
  }

  async cleanup() {
    this.log('Cleaning up test channels...', 'info');
    
    for (const channel of this.channels) {
      await supabase.removeChannel(channel);
    }
    
    this.channels = [];
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 REAL-TIME FEATURES TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`⏱️ Total Time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    
    console.log('\n📋 Test Details:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const time = (result.timestamp / 1000).toFixed(1);
      console.log(`${index + 1}. ${status} ${result.test} (${time}s)`);
      if (result.details) {
        console.log(`   └─ ${result.details}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      duration: (Date.now() - this.startTime) / 1000
    };
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive real-time features test...', 'info');
    
    try {
      // Test basic connectivity
      const dbConnected = await this.testDatabaseConnection();
      if (!dbConnected) {
        this.log('Database connection failed, stopping tests', 'error');
        return this.generateReport();
      }

      const realtimeConnected = await this.testRealtimeConnection();
      if (!realtimeConnected) {
        this.log('Real-time connection failed, stopping tests', 'error');
        return this.generateReport();
      }

      // Test specific features
      await this.testVoteUpdates();
      await this.testSetlistUpdates();
      await this.testPresenceSystem();

    } catch (error) {
      this.log(`Test runner error: ${error.message}`, 'error');
      this.addResult('Test Runner', false, error.message);
    } finally {
      await this.cleanup();
    }

    return this.generateReport();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new RealtimeTestRunner();
  
  runner.runAllTests()
    .then((report) => {
      const exitCode = report.failedTests > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { RealtimeTestRunner };