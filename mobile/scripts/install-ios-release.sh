#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVICE_ID="${1:-E5514FBB-F1D4-5388-B5CD-849C9782831E}"
APP_PATH="$ROOT_DIR/ios/build/DerivedData/Build/Products/Release-iphoneos/khthlkshfh.app"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

GOOGLE_MAPS_API_KEY="${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:-}"
if [[ -z "$GOOGLE_MAPS_API_KEY" ]]; then
  echo "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is required for the iOS Google Maps release build." >&2
  exit 1
fi

cd "$ROOT_DIR"

NODE_ENV=production \
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
GMS_API_KEY="$GOOGLE_MAPS_API_KEY" \
xcodebuild \
  -workspace ios/khthlkshfh.xcworkspace \
  -scheme khthlkshfh \
  -configuration Release \
  -destination "id=$DEVICE_ID" \
  -derivedDataPath ios/build/DerivedData \
  build

BUILT_GMS_KEY="$(plutil -extract GMSApiKey raw -o - "$APP_PATH/Info.plist" 2>/dev/null || true)"
if [[ -z "$BUILT_GMS_KEY" || "$BUILT_GMS_KEY" == \$\(* ]]; then
  echo "Built app is missing a resolved GMSApiKey. Refusing to install." >&2
  exit 1
fi

if [[ ! -s "$APP_PATH/main.jsbundle" ]]; then
  echo "Built app is missing main.jsbundle. Refusing to install." >&2
  exit 1
fi

xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
