#!/usr/bin/env node
import { execSync } from 'child_process';
import { mkdirSync, existsSync, cpSync } from 'fs';

console.log('🚀 Building FoodTracker for deployment...');

try {
  // Create dist directory
  if (existsSync('dist')) {
    execSync('rm -rf dist');
  }
  mkdirSync('dist', { recursive: true });

  console.log('📦 Building frontend...');
  execSync('npx vite build --config vite.config.prod.ts', { stdio: 'inherit' });

  console.log('🔍 Type checking...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  
  console.log('📦 Building backend...');
  execSync(`npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --external:express --external:drizzle-orm --external:@neondatabase/serverless --external:ws --external:connect-pg-simple --external:passport --external:openid-client --external:multer --external:openai --external:memoizee --external:express-session --external:passport-local`, { stdio: 'inherit' });

  // Verify and fix file locations
  console.log('🔍 Checking build output...');
  
  // Check if frontend was built correctly
  if (!existsSync('dist/public') && existsSync('client/dist')) {
    console.log('Moving frontend from client/dist to dist/public...');
    execSync('mkdir -p dist && mv client/dist dist/public');
  }
  
  // Ensure dist/public exists and has content
  if (!existsSync('dist/public/index.html')) {
    console.log('Frontend build appears incomplete, checking for alternative locations...');
    if (existsSync('client/dist/index.html')) {
      execSync('cp -r client/dist/* dist/public/');
    }
  }
  
  console.log('✅ Build completed successfully!');
  console.log('📁 Files created:');
  
  if (existsSync('dist/index.js')) {
    console.log('  ✅ Backend: dist/index.js');
  } else {
    console.log('  ❌ Backend: dist/index.js MISSING');
    process.exit(1);
  }
  
  if (existsSync('dist/public')) {
    console.log('  ✅ Frontend: dist/public/');
  } else {
    console.log('  ❌ Frontend: dist/public/ MISSING');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}