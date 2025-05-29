#!/bin/bash

# Build frontend
echo "🔨 Building frontend..."
npx vite build --outDir=dist/public

# Build backend with all external dependencies
echo "🔨 Building backend..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --external:express \
  --external:drizzle-orm \
  --external:@neondatabase/serverless \
  --external:ws \
  --external:connect-pg-simple \
  --external:passport \
  --external:openid-client \
  --external:multer \
  --external:openai \
  --external:memoizee \
  --external:express-session \
  --external:passport-local

# Verify files exist
echo "🔍 Verifying build files..."
if [ -f "dist/index.js" ]; then
    echo "✅ Backend build successful: dist/index.js"
    ls -la dist/index.js
else
    echo "❌ Backend build failed: dist/index.js not found"
    exit 1
fi

if [ -d "dist/public" ]; then
    echo "✅ Frontend build successful: dist/public/"
    ls -la dist/public/
else
    echo "❌ Frontend build failed: dist/public/ not found"
    exit 1
fi

echo "🎉 Build completed successfully!"