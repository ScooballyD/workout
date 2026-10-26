$ErrorActionPreference = 'Stop'
$guideRoot = $PSScriptRoot
$failures = @()
$links = 0
foreach ($file in Get-ChildItem -LiteralPath $guideRoot -Filter '*.md') {
    $raw = Get-Content -LiteralPath $file.FullName -Raw
    $fences = [regex]::Matches($raw, '(?m)^```').Count
    if ($fences % 2 -ne 0) { $failures += "Unbalanced code fences: $($file.Name)" }
    foreach ($match in [regex]::Matches($raw, '\[[^\]]+\]\(([^)]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^(https?://|#)') { continue }
        $target = ($target -split '#')[0]
        if (-not (Test-Path -LiteralPath (Join-Path $guideRoot $target))) {
            $failures += "Broken link in $($file.Name): $target"
        }
        $links++
    }
    git check-ignore --no-index -q -- $file.FullName
    if ($LASTEXITCODE -ne 0) { $failures += "Guide file is not ignored: $($file.Name)" }
}
if ($failures.Count -gt 0) { throw ($failures -join "`n") }
$tracked = @(git ls-files -- private-study-guide)
if ($tracked.Count -gt 0) { throw 'Guide contains tracked files' }
Write-Output "PASS: $links local links, balanced Markdown fences, all guide chapters ignored, no tracked guide files."
