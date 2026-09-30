param([Parameter(Mandatory)][string]$FilePath)
$ErrorActionPreference = 'Stop'
Import-Module ArtifactSigning -RequiredVersion 0.1.20
$params = @{
    Endpoint = 'https://weu.codesigning.azure.net/'
    CodeSigningAccountName = 'ricoslabs-signing'
    CertificateProfileName = 'ricoslabs-public'
    Files = (Resolve-Path -LiteralPath $FilePath).Path
    FileDigest = 'SHA256'
    TimestampRfc3161 = 'http://timestamp.acs.microsoft.com'
    TimestampDigest = 'SHA256'
    ExcludeEnvironmentCredential = $true
    ExcludeWorkloadIdentityCredential = $true
    ExcludeManagedIdentityCredential = $true
    ExcludeSharedTokenCacheCredential = $true
    ExcludeVisualStudioCredential = $true
    ExcludeVisualStudioCodeCredential = $true
    ExcludeAzureCliCredential = $false
    ExcludeAzurePowerShellCredential = $true
    ExcludeAzureDeveloperCliCredential = $true
    ExcludeInteractiveBrowserCredential = $true
}
Invoke-ArtifactSigning @params
# Do not let a custom signing hook report success for an unsigned file.
$signature = Get-AuthenticodeSignature -LiteralPath $FilePath
if ($signature.Status -ne 'Valid' -or
    $signature.SignerCertificate.GetNameInfo('SimpleName', $false) -ne 'Ricos Labs LLC' -or
    $null -eq $signature.TimeStamperCertificate) {
    throw "Invalid or untimestamped Ricos Labs LLC signature: $FilePath ($($signature.Status))"
}
