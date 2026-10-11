$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
       Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_API_URL = "http://$ip:8000/api"
$env:EXPO_METRO_PORT = "8082"
npx expo start --lan --port 8082 -c
