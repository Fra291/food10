
#!/usr/bin/env node
import { existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

console.log('🚀 Starting FoodTracker...');
console.log('📁 Checking files...');

// Check if required files exist
const backendFile = path.resolve('dist/index.js');
const frontendDir = path.resolve('dist/public');

if (!existsSync(backendFile)) {
  console.error(`❌ Backend file not found: ${backendFile}`);
  process.exit(1);
}

if (!existsSync(frontendDir)) {
  console.error(`❌ Frontend directory not found: ${frontendDir}`);
  process.exit(1);
}

console.log(`✅ Backend: ${backendFile}`);
console.log(`✅ Frontend: ${frontendDir}`);

// Set production environment
process.env.NODE_ENV = 'production';

// Import and start the server
try {
  const { default: server } = await import('./dist/index.js');
  console.log('🎉 FoodTracker started successfully!');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
