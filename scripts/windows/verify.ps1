$ErrorActionPreference = 'Stop'
$report = [System.Collections.Generic.List[object]]::new()
function Assert-Signature([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Missing signed file: $Path" }
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne 'Valid') { throw "Invalid signature: $Path ($($signature.Status))" }
    $publisher = $signature.SignerCertificate.GetNameInfo('SimpleName', $false)
    if ($publisher -ne 'Ricos Labs LLC') { throw "Unexpected publisher: $publisher" }
    if ($null -eq $signature.TimeStamperCertificate) { throw "Missing timestamp: $Path" }
    $report.Add([ordered]@{
        file = $Path
        status = [string]$signature.Status
        publisher = $publisher
        subject = $signature.SignerCertificate.Subject
        thumbprint = $signature.SignerCertificate.Thumbprint
        timestampSubject = $signature.TimeStamperCertificate.Subject
        sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    })
}
Assert-Signature 'release/win-unpacked/streaks.exe'
$installers = @(Get-ChildItem release -Filter '*.exe' -File)
if ($installers.Count -ne 1) { throw "Expected one NSIS installer; found $($installers.Count)" }
Assert-Signature $installers[0].FullName
$installDir = Join-Path $env:RUNNER_TEMP 'streaks-signature-check'
try {
    $process = Start-Process -FilePath $installers[0].FullName -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "NSIS installation failed: $($process.ExitCode)" }
    Assert-Signature (Join-Path $installDir 'streaks.exe')
    Assert-Signature (Join-Path $installDir 'Uninstall streaks.exe')
    $report | ConvertTo-Json -Depth 4 | Set-Content release/windows-signatures.json
    $report | Format-Table file, status, publisher
} finally {
    $uninstaller = Join-Path $installDir 'Uninstall streaks.exe'
    if (Test-Path -LiteralPath $uninstaller) {
        Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait
    }
}
