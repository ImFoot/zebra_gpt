# Run from project root. Extracts the canonical numbered concept archive.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$zip = Join-Path $projectRoot 'assets\archives\ZEBRA_complete_artwork.zip'
$destination = Join-Path $projectRoot 'assets\concept_art'
if (!(Test-Path -LiteralPath $zip)) { throw "Missing artwork archive: $zip" }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Expand-Archive -LiteralPath $zip -DestinationPath $destination -Force
Write-Host "Extracted to: $destination"
Write-Host "See the extracted image_manifest.json and the treatment JSON for image ID references."
