param(
  [string]$Serial = "",
  [int]$MobileMetroPort = 8081,
  [int]$FrontdeskMetroPort = 8082,
  [int]$BackendPort = 8000,
  [string]$PackageName = "com.takeasip.frontdesk",
  [switch]$Relaunch,
  [switch]$ClearData
)

$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
  if ($env:ADB_PATH -and (Test-Path $env:ADB_PATH)) {
    return $env:ADB_PATH
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

  $fromPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  throw "adb not found. Install Android platform-tools or add adb to PATH."
}

function Get-DeviceLines {
  param([string]$AdbPath)
  $devicesOutput = & $AdbPath devices
  return $devicesOutput | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
}

function Resolve-OnlineDevice {
  param(
    [string]$AdbPath,
    [string]$PreferredSerial,
    [int]$Retries = 7
  )

  for ($attempt = 1; $attempt -le $Retries; $attempt++) {
    $deviceLines = Get-DeviceLines -AdbPath $AdbPath
    Write-Host "adb devices (attempt $attempt/$Retries):"
    if ($deviceLines.Count -eq 0) {
      Write-Host "  <none>"
    } else {
      $deviceLines | ForEach-Object { Write-Host "  $_" }
    }

    if ($PreferredSerial) {
      $found = $deviceLines | Where-Object { $_ -match "^$PreferredSerial\t" } | Select-Object -First 1
      if ($found -and $found -match "\tdevice$") {
        return $PreferredSerial
      }
    } else {
      $online = $deviceLines | Where-Object { $_ -match "\tdevice$" } | Select-Object -First 1
      if ($online) {
        return ($online -split "\t")[0]
      }
    }

    if ($attempt -lt $Retries) {
      & $AdbPath reconnect offline | Out-Null
      Start-Sleep -Milliseconds 1200
    }
  }

  $finalLines = Get-DeviceLines -AdbPath $AdbPath
  $summary = if ($finalLines.Count -eq 0) { "<none>" } else { ($finalLines -join "; ") }
  if ($PreferredSerial) {
    throw "Device '$PreferredSerial' is not ONLINE. adb devices: $summary"
  }
  throw "No ONLINE adb device found. adb devices: $summary"
}

$env:ADB_MDNS_OPENSCREEN = "0"
$env:ADB_LIBUSB = "0"

$adb = Resolve-AdbPath
Write-Host "Using adb: $adb"

taskkill /F /IM adb.exe 2>$null | Out-Null
Start-Sleep -Milliseconds 600
& $adb start-server | Out-Null
& $adb reconnect offline | Out-Null

if (-not $Serial -and $env:ADB_SERIAL) {
  $Serial = $env:ADB_SERIAL
}

$pickedSerial = Resolve-OnlineDevice -AdbPath $adb -PreferredSerial $Serial
Write-Host "Using device serial: $pickedSerial"

$state = (& $adb -s $pickedSerial get-state).Trim()
if ($state -ne "device") {
  throw "Device '$pickedSerial' is not online. adb get-state returned: $state"
}

Write-Host "Applying reverse ports..."
& $adb -s $pickedSerial reverse --remove-all | Out-Null
& $adb -s $pickedSerial reverse "tcp:$MobileMetroPort" "tcp:$FrontdeskMetroPort" | Out-Null
& $adb -s $pickedSerial reverse "tcp:$FrontdeskMetroPort" "tcp:$FrontdeskMetroPort" | Out-Null
& $adb -s $pickedSerial reverse "tcp:$BackendPort" "tcp:$BackendPort" | Out-Null

Write-Host "Current reverse table:"
& $adb -s $pickedSerial reverse --list

if ($Relaunch) {
  if ($ClearData) {
    Write-Host "Clearing app data for $PackageName"
    & $adb -s $pickedSerial shell pm clear $PackageName | Out-Null
  } else {
    Write-Host "Force stopping $PackageName"
    & $adb -s $pickedSerial shell am force-stop $PackageName | Out-Null
  }

  Write-Host "Launching $PackageName"
  & $adb -s $pickedSerial shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1 | Out-Null
}

Write-Host "Done. Device is online and reverse rules are ready."
