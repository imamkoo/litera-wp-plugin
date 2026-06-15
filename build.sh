#!/bin/bash

echo "🧹 Cleaning previous builds..."
rm -rf build out
mkdir out

echo "🚀 Building Litera Plugin V2..."
# Tambahkan variable agar CSS masuk ke JS
export INLINE_RUNTIME_CHUNK=true
export GENERATE_SOURCEMAP=false
export PUBLIC_URL=./

yarn build

# Cek apakah file bundle.js tercipta
if [ -f "build/static/js/bundle.js" ]; then
    echo "📦 Packaging bundle.js..."
    cp build/static/js/bundle.js out/bundle.js
    
    # Jika masih ada chunk tersisa, gabungkan saja agar aman
    if ls build/static/js/*.chunk.js 1> /dev/null 2>&1; then
        cat build/static/js/*.chunk.js >> out/bundle.js
        echo "🔗 Chunks merged into bundle.js"
    fi

    echo "✅ Success! File: out/bundle.js"
    echo "👉 Upload file ini ke https://cdn.literaa.xyz/bundle.js"
else
    echo "❌ Error: build/static/js/bundle.js not found!"
    exit 1
fi