param()

$outDir = Join-Path $PSScriptRoot '..\public\circuit'
$pairs = @(
  @{ Glob = '2023 Las Vegas*'; Id = 'path5483' },
  @{ Glob = 'Ain-Diab*'; Id = 'path3180' },
  @{ Glob = 'Albert_Park*'; Id = 'path1559' },
  @{ Glob = 'Bahrain*'; Id = 'path4783' },
  @{ Glob = 'Boavista*'; Id = 'path2526' },
  @{ Glob = 'Brands_Hatch*'; Id = 'path3150' },
  @{ Glob = 'Buddh*'; Id = 'path104-6' },
  @{ Glob = 'Caesars*'; Id = 'path1' },
  @{ Glob = 'Circuit AVUS*'; Id = 'path2343' },
  @{ Glob = '*Magny-Cours*'; Id = 'path3497' },
  @{ Glob = '*Fair Park Dallas*'; Id = 'path3152' },
  @{ Glob = '*Silverstone 2010*'; Id = '2' },
  @{ Glob = '*Jerez*'; Id = 'path2818' },
  @{ Glob = '*Jarama*'; Id = 'path2417' },
  @{ Glob = 'Circuit_Aintree*'; Id = 'path2451' },
  @{ Glob = 'Downtown Detroit*'; Id = 'path3783' },
  @{ Glob = 'Estoril track map*'; Id = 'path2794' },
  @{ Glob = '*Baku City*'; Id = 'path4209' },
  @{ Glob = '*Circuit of the Americas*'; Id = 'path4146' },
  @{ Glob = '*Paul Ricard*'; Id = 'path4217' },
  @{ Glob = 'Fuji Speedway*'; Id = 'path105' },
  @{ Glob = 'Indianapolis*'; Id = 'path4209' },
  @{ Glob = 'Long Beach*'; Id = 'path4' },
  @{ Glob = 'Madring*'; Id = 'path1' },
  @{ Glob = 'Montju*'; Id = 'path6539' },
  @{ Glob = '*burgring*'; Id = 'path3128' },
  @{ Glob = 'Rouen*'; Id = 'path2406' },
  @{ Glob = 'Scandinavian*'; Id = 'Scandinavian Raceway Anderstorp' },
  @{ Glob = 'Sebring*'; Id = 'path4147' },
  @{ Glob = 'Valencia*'; Id = 'path3573' }
)

foreach ($p in $pairs) {
  $f = Get-ChildItem -LiteralPath $outDir | Where-Object { $_.Name -like $p.Glob } | Select-Object -First 1
  if (-not $f) { Write-Output "NO FILE: $($p.Glob)"; continue }
  $text = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
  if ($text -match 'id="track"') { Write-Output "ALREADY: $($f.Name)"; continue }
  $oldId = [regex]::Escape($p.Id)
  $ref = [regex]::Match($text, "url\(#$oldId\)")
  if ($ref.Success) { Write-Output "REFERENCED (skip): $($f.Name) id=$($p.Id)"; continue }
  $re = [regex]::Match($text, '(?s)<path[^>]*?id="' + $oldId + '"[^>]*>')
  if (-not $re.Success) { Write-Output "TARGET MISSING: $($f.Name) id=$($p.Id)"; continue }
  $newTag = $re.Value -replace ('id="' + $oldId + '"'), 'id="track"'
  $new = $text.Replace($re.Value, $newTag)
  Set-Content -LiteralPath $f.FullName -Value $new -Encoding UTF8 -NoNewline
  Write-Output "TAGGED: $($f.Name) (was id=$($p.Id))"
}