param([int]$Port = 43130)

Get-Content "..\..\..\GOAT.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim().Trim('"'), 'Process')
  }
}

$env:PORT = $Port
$out = [IO.Path]::GetTempFileName()
$err = [IO.Path]::GetTempFileName()
$proc = Start-Process -FilePath "node" -ArgumentList "--enable-source-maps", "dist/index.mjs" -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
try {
  Start-Sleep -Seconds 3
  $env:KTO_VERIFY_BASE_URL = "http://127.0.0.1:$Port"
  node scripts/verify-kto-live.mjs
  exit $LASTEXITCODE
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  Remove-Item -LiteralPath $out, $err -Force -ErrorAction SilentlyContinue
}
