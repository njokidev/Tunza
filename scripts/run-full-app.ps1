param(
    [string]$ApiHost = "",
    [int]$BackendPort = 8000,
    [int]$ExpoPort = 8082
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"
$mobilePath = Join-Path $repoRoot "mobile"
$pythonPath = Join-Path $backendPath "venv\Scripts\python.exe"

if ([string]::IsNullOrWhiteSpace($ApiHost)) {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.PrefixOrigin -ne 'WellKnown'
        } |
        Select-Object -First 1

    $ApiHost = if ($candidate) { $candidate.IPAddress } else { "127.0.0.1" }
}

$apiUrl = "http://$ApiHost`:$BackendPort/api"

Write-Host "Starting backend on 0.0.0.0:$BackendPort"
Write-Host "Mobile API URL: $apiUrl"
Write-Host "Expo dev server port: $ExpoPort"

$backendCommand = ""
if (Test-Path -LiteralPath $pythonPath) {
    $backendCommand = "Set-Location -LiteralPath '$backendPath'; & '.\venv\Scripts\python.exe' manage.py runserver 0.0.0.0:$BackendPort"
}
elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $backendCommand = "Set-Location -LiteralPath '$backendPath'; py manage.py runserver 0.0.0.0:$BackendPort"
}
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $backendCommand = "Set-Location -LiteralPath '$backendPath'; python manage.py runserver 0.0.0.0:$BackendPort"
}
else {
    throw "No Python executable found. Install Python or create backend\venv."
}

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $backendCommand
)

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath '$mobilePath'; `$env:EXPO_PUBLIC_API_URL='$apiUrl'; npm start -- --port $ExpoPort"
)

Write-Host "Opened backend and mobile terminals."
