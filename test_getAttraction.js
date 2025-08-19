// Quick test of getAttraction function
async function testGetAttraction() {
  try {
    const apiKey = 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const attractionId = 'K8vZ917GtG0'; // Our Last Night
    
    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${attractionId}.json?apikey=${apiKey}`;
    
    console.log('Testing getAttraction with URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('Success! Attraction data:');
      console.log('ID:', data.id);
      console.log('Name:', data.name);
      console.log('Classifications:', JSON.stringify(data.classifications, null, 2));
      console.log('External Links:', JSON.stringify(data.externalLinks, null, 2));
      console.log('Images:', data.images?.length || 0, 'images');
    } else {
      console.log('Error response:', response.status, data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testGetAttraction();