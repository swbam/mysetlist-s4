import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3001';

async function testEndpoints() {
  console.log('Testing MySetlist API endpoints...\n');

  const endpoints = [
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/test-db', name: 'Database Connection' },
    { path: '/api/trending/artists', name: 'Trending Artists' },
    { path: '/api/artists/search?q=taylor', name: 'Artist Search' },
    { path: '/api/shows/upcoming', name: 'Upcoming Shows' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}: ${endpoint.path}`);
      const response = await fetch(`${baseUrl}${endpoint.path}`);
      const status = response.status;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success (${status}):`, JSON.stringify(data).substring(0, 100) + '...\n');
      } else {
        const text = await response.text();
        console.log(`❌ Failed (${status}):`, text.substring(0, 100) + '...\n');
      }
    } catch (error) {
      console.log(`❌ Error:`, error.message, '\n');
    }
  }

  // Test the homepage
  try {
    console.log('Testing Homepage: /');
    const response = await fetch(`${baseUrl}/`);
    console.log(`Homepage status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const html = await response.text();
      const hasContent = html.includes('MySetlist');
      console.log(`✅ Homepage loads: ${hasContent ? 'Yes' : 'No'}`);
    }
  } catch (error) {
    console.log(`❌ Homepage error:`, error.message);
  }
}

testEndpoints();