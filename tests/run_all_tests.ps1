$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$DbPath = Join-Path $PSScriptRoot "test_local_suite.db"

Write-Host "=== 1. CHAY TEST FRONTEND (Node.js) ===" -ForegroundColor Cyan
node --test "$Root/tests/*.test.js" "$Root/frontend/tests/*.test.js"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. CHAY TEST BACKEND (Pytest) ===" -ForegroundColor Cyan
$env:PYTHONPATH = "$Root/backend"
$env:DATABASE_URL = "sqlite:///$($DbPath -replace '\\', '/')"
$env:SECRET_KEY = "local-test-secret-key-at-least-32-bytes"
& "$Root/.venv/Scripts/python.exe" -m pytest "$Root/backend/tests" "$Root/tests/test_backend_integration.py" -v --tb=short
$exitCode = $LASTEXITCODE
if (Test-Path $DbPath) { Remove-Item $DbPath -Force }
exit $exitCode
