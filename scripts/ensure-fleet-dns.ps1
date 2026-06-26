# Upsert fleet DNS on grudge-studio.com (reads existing records first).
param(
    [string]$ZoneId = "e8c0c2ee3063f24eb31affddabf9730a",
    [string]$Token = $env:CF_DNS_API_TOKEN,
    [string]$GameCname = "4585db421456af45.vercel-dns-016.com"
)

if (-not $Token) {
    foreach ($path in @(
        "C:\Users\nugye\Documents\1111111\GrudgeBuilder\.env",
        "C:\Users\nugye\Desktop\secret.txt"
    )) {
        if (-not (Test-Path $path)) { continue }
        $line = Select-String -Path $path -Pattern "^CF_DNS_API_TOKEN=" | Select-Object -First 1
        if ($line) { $Token = $line.Line.Split("=", 2)[1].Trim().Trim('"'); break }
    }
}
if (-not $Token) { throw "Set CF_DNS_API_TOKEN (Zone.DNS Edit) and re-run." }

function Test-PublicDns([string]$Fqdn) {
    try {
        Resolve-DnsName -Name $Fqdn -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
$base = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records"

function Get-Record([string]$Fqdn) {
    $uri = "$base?name=" + [uri]::EscapeDataString($Fqdn)
    return (Invoke-RestMethod -Headers $headers -Uri $uri).result
}

function Upsert-Record([string]$Name, [string]$Type, [string]$Content) {
    $fqdn = if ($Name -eq "@") { "grudge-studio.com" } else { "$Name.grudge-studio.com" }
    $existing = Get-Record $fqdn
    $body = @{ type = $Type; name = $Name; content = $Content; proxied = $true; ttl = 1 } | ConvertTo-Json
    if ($existing.Count -eq 0) {
        Write-Host "Creating $Type $fqdn -> $Content"
        $r = Invoke-RestMethod -Method POST -Headers $headers -Uri $base -Body $body
    } else {
        Write-Host "Updating $Type $fqdn -> $Content (was $($existing[0].content))"
        $r = Invoke-RestMethod -Method PUT -Headers $headers -Uri "$base/$($existing[0].id)" -Body $body
    }
    if (-not $r.success) { throw ($r.errors | ConvertTo-Json) }
    Write-Host "OK $fqdn"
}

Write-Host "=== Public DNS check ==="
$hosts = @(
    "nexus.grudge-studio.com",
    "platform.grudge-studio.com",
    "grudachain.grudge-studio.com",
    "game.grudge-studio.com",
    "tactics.grudge-studio.com"
)
foreach ($h in $hosts) {
    $status = if (Test-PublicDns $h) { "EXISTS" } else { "MISSING" }
    Write-Host "$h $status"
}

if (Test-PublicDns "nexus.grudge-studio.com") {
    Write-Host "Skip nexus - already public"
} elseif ((Test-PublicDns "platform.grudge-studio.com") -or (Test-PublicDns "grudachain.grudge-studio.com")) {
    Write-Host "Skip nexus - platform/grudachain already live"
} else {
    Upsert-Record "nexus" "CNAME" "grudachain.grudge-studio.com"
}

if (Test-PublicDns "game.grudge-studio.com") {
    Write-Host "Skip game - already public"
} else {
    Upsert-Record "game" "CNAME" $GameCname
}

Write-Host "Done."