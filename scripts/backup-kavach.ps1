<#
.SYNOPSIS
    Backs up the Kavach data directory to a timestamped, verified zip.

.DESCRIPTION
    Copies everything in the Kavach data directory (default: ~/.kavach) -
    kavach.db plus any -wal/-shm files, the localhost TLS keystore
    (kavach.p12, tls.key) and backup-destination.txt - into
    kavach-backup-<yyyyMMdd-HHmmss>.zip in the destination folder.

    Safety rules:
      * Refuses to run while Kavach is running. The database uses SQLite WAL
        mode, so a copy taken while the app is writing can be inconsistent.
        Close Kavach (tray -> Exit, or close its console window) first.
      * Writes MANIFEST.sha256 inside the zip, then re-opens the zip and
        checks every file against it before reporting success.
      * Keeps the newest -Keep backups and deletes older ones made by
        this script. Nothing else in the destination is touched.

    The vault contents are encrypted with the master password, but the zip
    also holds the TLS key material. Keep the destination private.

.PARAMETER DataDir
    Kavach data directory. Default: $HOME\.kavach (same default as the app;
    pass the value of -Dkavach.data.dir if you override it).

.PARAMETER Destination
    Folder that receives the zips. Created if missing.
    Default: $HOME\KavachBackups

.PARAMETER Keep
    How many backups to retain. 0 disables pruning. Default: 10.

.EXAMPLE
    .\scripts\backup-kavach.ps1

.EXAMPLE
    .\scripts\backup-kavach.ps1 -Destination D:\Backups\Kavach -Keep 20

.NOTES
    Restore: close Kavach, rename the current data dir (e.g. .kavach.old),
    extract the zip into a new $HOME\.kavach, delete MANIFEST.sha256 from it,
    then start Kavach.

    If script execution is blocked, run it with:
      powershell -ExecutionPolicy Bypass -File .\scripts\backup-kavach.ps1
#>
[CmdletBinding()]
param(
    [string]$DataDir = (Join-Path $HOME '.kavach'),
    [string]$Destination = (Join-Path $HOME 'KavachBackups'),
    [ValidateRange(0, 1000)]
    [int]$Keep = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-FileLocked {
    param([string]$Path)
    # SQLite holds the db open while Kavach runs; an exclusive open fails then.
    try {
        $stream = [System.IO.File]::Open($Path, 'Open', 'ReadWrite', 'None')
        $stream.Close()
        return $false
    } catch [System.IO.IOException] {
        return $true
    }
}

# ---- preconditions -------------------------------------------------------
if (-not (Test-Path -LiteralPath $DataDir -PathType Container)) {
    throw "Data directory not found: $DataDir"
}
$DataDir = (Resolve-Path -LiteralPath $DataDir).Path

$db = Join-Path $DataDir 'kavach.db'
if (-not (Test-Path -LiteralPath $db -PathType Leaf)) {
    throw "No kavach.db in $DataDir - is this the right data directory?"
}
if (Test-FileLocked $db) {
    throw "kavach.db is in use. Close Kavach, then run the backup again."
}

$files = @(Get-ChildItem -LiteralPath $DataDir -File)
$walFile = $files | Where-Object { $_.Name -eq 'kavach.db-wal' -and $_.Length -gt 0 }
if ($walFile) {
    # Not an error: the WAL holds committed data not yet merged into kavach.db.
    # It is backed up alongside the db and SQLite replays it on next open.
    Write-Host "Note: kavach.db-wal is non-empty; it is included in the backup."
}

if (-not (Test-Path -LiteralPath $Destination)) {
    New-Item -ItemType Directory -Path $Destination | Out-Null
}
$Destination = (Resolve-Path -LiteralPath $Destination).Path
if ($Destination.TrimEnd('\').StartsWith($DataDir.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination must not be inside the data directory."
}

# ---- stage, hash, zip -------------------------------------------------------
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipPath = Join-Path $Destination "kavach-backup-$stamp.zip"
$staging = Join-Path ([System.IO.Path]::GetTempPath()) "kavach-backup-$stamp"

New-Item -ItemType Directory -Path $staging | Out-Null
try {
    foreach ($f in $files) {
        Copy-Item -LiteralPath $f.FullName -Destination $staging
    }

    $manifest = foreach ($f in Get-ChildItem -LiteralPath $staging -File) {
        $h = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
        "$h  $($f.Name)"
    }
    # ASCII so the manifest reads the same everywhere (file names are ASCII).
    $manifest | Set-Content -LiteralPath (Join-Path $staging 'MANIFEST.sha256') -Encoding Ascii

    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath

    # ---- verify: extract and compare every file against the manifest ----
    $verifyDir = "$staging-verify"
    try {
        Expand-Archive -LiteralPath $zipPath -DestinationPath $verifyDir
        foreach ($line in $manifest) {
            $expected, $name = $line -split '  ', 2
            $actual = (Get-FileHash -LiteralPath (Join-Path $verifyDir $name) -Algorithm SHA256).Hash
            if ($actual -ne $expected) {
                Remove-Item -LiteralPath $zipPath -Force
                throw "Verification failed for $name - backup deleted."
            }
        }
    } finally {
        Remove-Item -LiteralPath $verifyDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}

$sizeKb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1KB, 1)
Write-Host "Backup OK: $zipPath ($($files.Count) files, $sizeKb KB, verified)"

# ---- prune old backups ------------------------------------------------------
if ($Keep -gt 0) {
    $old = @(Get-ChildItem -LiteralPath $Destination -File -Filter 'kavach-backup-*.zip' |
        Where-Object { $_.Name -match '^kavach-backup-\d{8}-\d{6}\.zip$' } |
        Sort-Object Name -Descending |
        Select-Object -Skip $Keep)
    foreach ($o in $old) {
        Remove-Item -LiteralPath $o.FullName -Force
        Write-Host "Pruned: $($o.Name)"
    }
}
