# Create nexus.grudge-studio.com DNS (proxied A) — same pattern as grudachain/platform.
# Requires a Cloudflare API token with Zone.DNS Edit on grudge-studio.com.
param(
    [string]$ZoneId = "e8c0c2ee3063f24eb31affddabf9730a",
    [string]$Token = $env:CF_DNS_API_TOKEN
)

if (-not $Token) {
    $envPath = "C:\Users\nugye\Documents\1111111\GrudgeBuilder\.env"
    if (Test-Path $envPath) {
        $line = Select-String -Path $envPath -Pattern "^CF_DNS_API_TOKEN=" | Select-Object -First 1
        if ($line) { $Token = $line.Line.Split("=", 2)[1].Trim().Trim('"') }
    }
}
if (-not $Token) { throw "Set CF_DNS_API_TOKEN (Zone.DNS Edit) and re-run." }

$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
$base = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records"
$existing = Invoke-RestMethod -Headers $headers -Uri "$base?name=nexus.grudge-studio.com"
if ($existing.result.Count -gt 0) {
    Write-Host "OK nexus.grudge-studio.com already exists ($($existing.result[0].type) $($existing.result[0].content))"
    exit 0
}
$body = @{
    type    = "A"
    name    = "nexus"
    content = "104.21.4.170"
    proxied = $true
    ttl     = 1
    comment = "Nexus hub (grudge-nexus-proxy Worker)"
} | ConvertTo-Json
$r = Invoke-RestMethod -Method POST -Headers $headers -Uri $base -Body $body
if (-not $r.success) { throw ($r.errors | ConvertTo-Json) }
Write-Host "Created nexus.grudge-studio.com -> 104.21.4.170 (proxied). Worker route grudge-nexus-proxy already deployed."