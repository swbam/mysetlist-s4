#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_URL || 'https://mysetlist-sonnet.vercel.app';

async function testSearchAPI() {
  console.log('🔍 Testing Search API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/search?q=taylor`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    console.log('Search API Status:', response.status);
    console.log('Results found:', data.results?.length || 0);
    
    if (data.error) {
      console.error('Search Error:', data.error);
    } else if (data.results?.length > 0) {
      console.log('✅ Search API working!');
      console.log('Sample result:', data.results[0]);
    } else {
      console.log('⚠️ Search returned no results');
    }
  } catch (error) {
    console.error('❌ Search API failed:', error);
  }
}

async function testArtistPage() {
  console.log('\n👨‍🎤 Testing Artist Page...');
  
  // First get an artist slug from search
  try {
    const searchResponse = await fetch(`${BASE_URL}/api/search?q=drake`);
    const searchData = await searchResponse.json();
    
    if (searchData.results?.length > 0) {
      const artist = searchData.results[0];
      console.log('Found artist:', artist.title, 'slug:', artist.slug);
      
      if (artist.slug) {
        // Test artist page
        const artistResponse = await fetch(`${BASE_URL}/artists/${artist.slug}`);
        console.log('Artist page status:', artistResponse.status);
        
        if (artistResponse.status === 200) {
          console.log('✅ Artist page working!');
        } else {
          console.error('❌ Artist page returned:', artistResponse.status);
          const text = await artistResponse.text();
          console.log('Response preview:', text.substring(0, 200));
        }
      }
    } else {
      console.log('⚠️ No artists found to test');
    }
  } catch (error) {
    console.error('❌ Artist page test failed:', error);
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ Testing Database Connection...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health/comprehensive`);
    const data = await response.json();
    
    console.log('Health check status:', response.status);
    console.log('Database status:', data.database?.status || 'unknown');
    
    if (data.database?.status === 'healthy') {
      console.log('✅ Database connection working!');
    } else {
      console.error('❌ Database issues:', data.database);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

async function main() {
  console.log(`🚀 Testing production deployment at: ${BASE_URL}\n`);
  
  await testDatabaseConnection();
  await testSearchAPI();
  await testArtistPage();
  
  console.log('\n✨ Tests complete!');
}

main().catch(console.error);