#!/bin/bash
# ============================================================
# Litera WordPress Plugin - Build & Package Script
# ============================================================
# Menjalankan build React, lalu mengemas plugin ke file .zip
# yang siap di-upload ke WordPress atau GitHub Releases.
# ============================================================

set -e

PLUGIN_SLUG="litera-wp-plugin"
VERSION=$(grep "Version:" litera.php | head -1 | awk '{print $NF}')

echo "========================================"
echo "  Litera Plugin Builder v${VERSION}"
echo "========================================"

# Step 1: Build React bundle
echo ""
echo "[1/4] Building React bundle..."
yarn build

# Step 2: Buat folder temporary untuk packaging
echo ""
echo "[2/4] Preparing package directory..."
TEMP_DIR="/tmp/${PLUGIN_SLUG}"
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}/includes"

# Step 3: Copy only production files (no src, node_modules, etc.)
echo ""
echo "[3/4] Copying production files..."
# Make sure the new build replaces the root bundle.js before packaging
cp build/bundle.js bundle.js
cp litera.php "${TEMP_DIR}/"
cp bundle.js "${TEMP_DIR}/"
cp -r includes/ "${TEMP_DIR}/includes/"

# Optional: copy readme if exists
[ -f "readme.txt" ] && cp readme.txt "${TEMP_DIR}/"
[ -f "README.md" ] && cp README.md "${TEMP_DIR}/"

# Step 4: Create .zip
echo ""
echo "[4/4] Creating ${PLUGIN_SLUG}.zip..."
cd /tmp
rm -f "${PLUGIN_SLUG}.zip"
zip -r "${PLUGIN_SLUG}.zip" "${PLUGIN_SLUG}/" -x "*.DS_Store"

# Move zip back to project root
mv "${PLUGIN_SLUG}.zip" "$OLDPWD/"

# Cleanup
rm -rf "${TEMP_DIR}"

cd "$OLDPWD"

echo ""
echo "========================================"
echo "  ✅ Package created successfully!"
echo "  📦 ${PLUGIN_SLUG}.zip"
echo "  📏 Size: $(du -h ${PLUGIN_SLUG}.zip | cut -f1)"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Upload to GitHub Releases as v${VERSION}"
echo "  2. Or upload directly via WP Admin → Plugins → Add New → Upload"
