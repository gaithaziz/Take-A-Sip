param(
  [string]$BackendUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
  $fromPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  $candidates = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Required command not found: adb. Install Android platform-tools and ensure adb is in PATH."
}

$adb = Resolve-AdbPath
Write-Host "Using adb: $adb"

try {
  $backendUri = [Uri]$BackendUrl
} catch {
  throw "Invalid backend URL: $BackendUrl"
}

$backendPort = if ($backendUri.IsDefaultPort) { 80 } else { $backendUri.Port }
if ($backendPort -le 0) {
  throw "Could not determine backend port from URL: $BackendUrl"
}

Write-Host "Checking connected Android devices..."
$deviceLines = (& $adb devices) | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
$onlineDevices = $deviceLines | Where-Object { $_ -match "\tdevice$" }
if (-not $onlineDevices) {
  throw "No authorized Android device found. Connect by USB and accept the device authorization prompt."
}

Write-Host "Setting USB reverse tunnel: tcp:$backendPort -> tcp:$backendPort"
& $adb reverse "tcp:$backendPort" "tcp:$backendPort" | Out-Null

Write-Host "Verifying backend health at $BackendUrl/docs ..."
try {
  $status = (Invoke-WebRequest -Uri "$BackendUrl/docs" -UseBasicParsing -TimeoutSec 5).StatusCode
  if ($status -ne 200) {
    throw "Unexpected status code: $status"
  }
} catch {
  throw "Backend check failed at $BackendUrl/docs. Ensure backend is running before launching the app."
}

Write-Host "USB setup complete."
Write-Host "Built app should use EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000"
