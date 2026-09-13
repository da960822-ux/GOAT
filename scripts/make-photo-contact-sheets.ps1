Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$workDir = Join-Path $repoRoot 'tmp\photo-selection'
$manifestPath = Join-Path $workDir 'candidates.json'
$manifest = [System.IO.File]::ReadAllText($manifestPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$labels = @('A', 'B', 'C', 'D', 'E', 'F')

foreach ($place in $manifest) {
  $valid = @()
  foreach ($candidate in $place.candidates) {
    $filePath = Join-Path (Join-Path $workDir $place.place_id) $candidate.fileName
    try {
      $image = [System.Drawing.Image]::FromFile($filePath)
      if ($image.Width -lt 640 -or $image.Height -lt 360) {
        $image.Dispose()
        continue
      }
      $candidate | Add-Member -NotePropertyName width -NotePropertyValue $image.Width
      $candidate | Add-Member -NotePropertyName height -NotePropertyValue $image.Height
      $image.Dispose()
      $valid += $candidate
    } catch {
      continue
    }
  }
  $place.candidates = @($valid | Select-Object -First 6)
  if ($place.candidates.Count -eq 0) { continue }

  $cellWidth = 512
  $cellHeight = 360
  $headerHeight = 92
  $sheet = New-Object System.Drawing.Bitmap ($cellWidth * 2), ($headerHeight + $cellHeight * 3)
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  $graphics.Clear([System.Drawing.Color]::FromArgb(245, 245, 245))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $font = New-Object System.Drawing.Font 'Malgun Gothic', 15
  $smallFont = New-Object System.Drawing.Font 'Malgun Gothic', 11
  $graphics.DrawString("$($place.place_id)  $($place.place_name)", $font, [System.Drawing.Brushes]::Black, 12, 8)
  $graphics.DrawString("$($place.primary_mood) | $($place.photo_point)", $smallFont, [System.Drawing.Brushes]::DimGray, 12, 42)

  for ($index = 0; $index -lt $place.candidates.Count; $index++) {
    $candidate = $place.candidates[$index]
    $filePath = Join-Path (Join-Path $workDir $place.place_id) $candidate.fileName
    $image = [System.Drawing.Image]::FromFile($filePath)
    $column = $index % 2
    $row = [Math]::Floor($index / 2)
    $x = $column * $cellWidth
    $y = $headerHeight + $row * $cellHeight
    $scale = [Math]::Min($cellWidth / $image.Width, ($cellHeight - 30) / $image.Height)
    $width = [int]($image.Width * $scale)
    $height = [int]($image.Height * $scale)
    $offsetX = $x + [int](($cellWidth - $width) / 2)
    $offsetY = $y + [int](($cellHeight - 30 - $height) / 2)
    $graphics.DrawImage($image, $offsetX, $offsetY, $width, $height)
    $graphics.FillRectangle([System.Drawing.Brushes]::Black, $x, $y + $cellHeight - 30, $cellWidth, 30)
    $graphics.DrawString("$($labels[$index])  $($candidate.title)", $smallFont, [System.Drawing.Brushes]::White, $x + 8, $y + $cellHeight - 27)
    $image.Dispose()
  }

  $sheetPath = Join-Path $workDir "$($place.place_id)-contact.jpg"
  $sheet.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $graphics.Dispose()
  $sheet.Dispose()
  $font.Dispose()
  $smallFont.Dispose()
}

$json = $manifest | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($manifestPath, $json + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
