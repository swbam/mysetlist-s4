const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function analyzeBundle() {
  console.log('Starting bundle analysis...\n');
  
  try {
    // Build with bundle analyzer
    const { stdout, stderr } = await execAsync('ANALYZE=true pnpm build', {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });
    
    // Extract bundle sizes from build output
    const lines = stdout.split('\n');
    const bundleInfo = [];
    
    lines.forEach((line) => {
      if (line.includes('First Load JS') || line.includes('kB') || line.includes('MB')) {
        bundleInfo.push(line);
      }
    });
    
    console.log('Bundle Analysis Results:');
    console.log('========================\n');
    bundleInfo.forEach(line => console.log(line));
    
    // Look for specific routes
    const routes = ['/', '/artists/[slug]', '/shows/[slug]'];
    console.log('\n\nRoute-specific bundle sizes:');
    console.log('===========================');
    
    routes.forEach(route => {
      const routeLine = lines.find(line => line.includes(route));
      if (routeLine) {
        console.log(routeLine);
      }
    });
    
  } catch (error) {
    console.error('Error during bundle analysis:', error.message);
    // Continue even if build fails
  }
}

analyzeBundle();