param(
  [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)][string[]]$Circuit
)

$headers = @{ 'User-Agent' = 'F1GridArchive/0.2 (personal hobby project)' }
$api = 'https://en.wikipedia.org/w/api.php'
$outDir = Join-Path $PSScriptRoot '..\public\circuit'

function Get-SvgTitle([string]$name) {
  $q = [uri]::EscapeDataString("$name circuit")
  $hits = $null
  try {
    $r = Invoke-RestMethod -Uri "$api`?action=query&list=search&srsearch=$q&srnamespace=6&srlimit=12&format=json" -Headers $headers -TimeoutSec 30
    $hits = $r.query.search
  } catch { }
  if (-not $hits) { return $null }
  $svgs = @($hits | Where-Object { $_.title -match '\.svg$' } | ForEach-Object { $_.title -replace '^File:', '' })
  if (-not $svgs.Count) { return $null }
  $tokens = @($name.ToLower() -split '\s+' | Where-Object { $_ -match '[a-z0-9]' })
  $exact = @($svgs | Where-Object { $_.ToLower() -eq (($tokens -join '_') + '.svg') })
  if ($exact.Count) { return $exact[0] }
  $scored = @($svgs | ForEach-Object {
    $l = $_.ToLower()
    [pscustomobject]@{ Title = $_; Score = @($tokens | Where-Object { $l -match [regex]::Escape($_) }).Count }
  } | Sort-Object Score -Descending)
  if ($scored[0].Score -gt 0) { return $scored[0].Title }
  return $svgs[0]
}

function Get-File([string]$title) {
  $dest = Join-Path $outDir $title
  if (Test-Path -LiteralPath $dest) {
    Write-Output "SKIP (exists): $title"
    return
  }
  $encoded = [uri]::EscapeDataString("File:$title")
  $url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/$encoded"
  $backoff = @(15, 45, 90, 180)
  foreach ($attempt in 1..$backoff.Count) {
    try {
      Invoke-WebRequest -Uri $url -Headers $headers -OutFile $dest -UseBasicParsing -TimeoutSec 120 -MaximumRedirection 5
      $size = (Get-Item -LiteralPath $dest).Length
      if ($size -lt 1000) {
        Write-Output "SUSPICIOUS ($size bytes): $title"
        Remove-Item -LiteralPath $dest
        return
      }
      if ($size -gt 8000000) {
        Write-Output "TOO BIG ($size bytes): $title"
        Remove-Item -LiteralPath $dest
        return
      }
      Write-Output "OK: $title ($size bytes)"
      return
    } catch {
      Write-Output "  retry $attempt ($title): $($_.Exception.Message.Split("`n")[0])"
      Start-Sleep -Seconds $backoff[$attempt - 1]
    }
  }
  Write-Output "DOWNLOAD FAIL: $title"
}

foreach ($c in $Circuit) {
  $title = Get-SvgTitle $c
  if ($title) {
    Write-Output "== $c -> File:$title"
    Get-File $title
  } else {
    Write-Output "NO FILE FOUND: $c"
  }
  Start-Sleep -Seconds 6
}
