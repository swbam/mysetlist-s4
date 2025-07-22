import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the app directory path
    const appDir = path.join(process.cwd(), 'app');
    
    // Function to recursively find all page.tsx files
    function findPages(dir: string, prefix = ''): string[] {
      const results: string[] = [];
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isDirectory()) {
          // Skip api, components, and other non-route directories
          if (['api', 'components', 'hooks', 'lib', 'utils'].includes(file.name)) {
            continue;
          }
          
          const nextPrefix = prefix ? `${prefix}/${file.name}` : file.name;
          results.push(...findPages(path.join(dir, file.name), nextPrefix));
        } else if (file.name === 'page.tsx' || file.name === 'page.ts') {
          results.push(prefix || '/');
        }
      }
      
      return results;
    }
    
    const routes = findPages(appDir);
    
    // Check specific routes
    const testRoutes = ['/artists', '/shows', '/venues', '/trending'];
    const routeStatus = testRoutes.map(route => ({
      route,
      exists: routes.includes(route.slice(1)) || routes.includes(route),
      pageFile: fs.existsSync(path.join(appDir, route.slice(1), 'page.tsx'))
    }));
    
    return NextResponse.json({
      success: true,
      allRoutes: routes.sort(),
      specificRoutes: routeStatus,
      totalRoutes: routes.length,
      appDirectory: appDir,
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Routes test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Routes test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}