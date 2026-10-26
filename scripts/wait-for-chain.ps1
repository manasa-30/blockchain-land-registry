$ErrorActionPreference = "Stop"
$endpoint = "http://127.0.0.1:8545"
$body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

for ($attempt = 0; $attempt -lt 45; $attempt++) {
    try {
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -ContentType "application/json" -Body $body -TimeoutSec 2
        if ($response.result -eq "0x7a69") { exit 0 }
    } catch {
        # The local node may still be starting.
    }
    Start-Sleep -Seconds 1
}

Write-Error "Hardhat Local did not respond on $endpoint. Check the Hardhat Local Node window."
exit 1
