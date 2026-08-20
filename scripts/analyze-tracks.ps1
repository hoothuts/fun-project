param()

$outDir = Join-Path $PSScriptRoot '..\public\circuit'

function Get-Candidates([string]$text) {
  $blocks = [regex]::Matches($text, '<path\b[^>]*>')
  $out = @()
  foreach ($b in $blocks) {
    $tag = $b.Value
    $d = [regex]::Match($tag, '(?<![-\w])d="([^"]*)"').Groups[1].Value
    if (-not $d) { continue }
    $style = [regex]::Match($tag, 'style="([^"]*)"').Groups[1].Value
    $strokeAttr = [regex]::Match($tag, 'stroke="([^"]*)"').Groups[1].Value
    $fillAttr = [regex]::Match($tag, 'fill="([^"]*)"').Groups[1].Value
    $id = [regex]::Match($tag, 'id="([^"]*)"').Groups[1].Value
    $nums = @([regex]::Matches($d, '-?\d+(?:\.\d+)?') | ForEach-Object { [double]$_.Value })
    $xs = @(); $ys = @()
    for ($i = 0; $i -lt $nums.Count - 1; $i += 2) { $xs += $nums[$i]; $ys += $nums[$i + 1] }
    $bboxW = if ($xs.Count) { ($xs | Measure-Object -Maximum).Maximum - ($xs | Measure-Object -Minimum).Minimum } else { 0 }
    $bboxH = if ($ys.Count) { ($ys | Measure-Object -Maximum).Maximum - ($ys | Measure-Object -Minimum).Minimum } else { 0 }
    $subs = ([regex]::Matches($d, '[Mm]')).Count
    $out += [pscustomobject]@{
      Id = $id; Len = $d.Length; Subs = $subs; BboxW = [math]::Round($bboxW); BboxH = [math]::Round($bboxH)
      Z = ($d.TrimEnd() -match '[zZ]$'); Black = (($style + $strokeAttr) -match '#000');
      Fill = if ($fillAttr) { $fillAttr } elseif ($style -match 'fill:([^;]*)') { $Matches[1] } else { '' }
      StrokeW = if ($style -match 'stroke-width:([^;]*)') { $Matches[1] } elseif ($tag -match 'stroke-width="([^"]*)"') { $Matches[1] } else { '' }
    }
  }
  return $out
}

$files = Get-ChildItem -LiteralPath $outDir -Filter '*.svg' | Where-Object { $_.Name -ne 'Donington_circuit.svg' }
foreach ($f in $files) {
  $text = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
  $cands = @(Get-Candidates $text | Sort-Object -Property @{ Expression = { $_.Len }; Descending = $true })
  if (-not $cands.Count) { Write-Output "`n== $($f.Name): NO PATHS"; continue }
  $top = $cands | Select-Object -First 5
  Write-Output "`n== $($f.Name)"
  $i = 0
  foreach ($c in $top) {
    $i++
    Write-Output ("  #{0} id={1,-22} len={2,-6} subs={3,-3} bbox={4}x{5,-6} z={6} black={7} fill={8,-16} sw={9}" -f $i, $c.Id, $c.Len, $c.Subs, $c.BboxW, $c.BboxH, $c.Z, $c.Black, $c.Fill, $c.StrokeW)
  }
}