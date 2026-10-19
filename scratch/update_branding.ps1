# PowerShell script to update branding from ENERGY CCTV to ENQOVA

$targetFiles = Get-ChildItem -Exclude node_modules,.git -Recurse | Where-Object { 
    ! $_.PSIsContainer -and 
    $_.FullName -notmatch '\\node_modules\\' -and 
    $_.Extension -match '\.(html|js|json|sql|env|css|md|txt)$' 
}

foreach ($file in $targetFiles) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    if ($null -eq $content) { continue }
    
    $updated = $content
    
    # Precise replacements
    $updated = $updated -replace 'ENERGY CCTV SECURITY CAMERA SOLUTION', 'ENQOVA SMART LIFE'
    $updated = $updated -replace 'Energy CCTV Security Camera Solution', 'ENQOVA SMART LIFE'
    $updated = $updated -replace 'ENERGY CCTV POS', 'ENQOVA POS'
    $updated = $updated -replace 'ENERGY CCTV', 'ENQOVA'
    $updated = $updated -replace 'Energy CCTV', 'ENQOVA'
    $updated = $updated -replace 'energy_cctv_token', 'enqova_token'
    $updated = $updated -replace 'energy_cctv_user', 'enqova_user'
    $updated = $updated -replace 'energy_cctv_', 'enqova_'
    $updated = $updated -replace 'energy_cctv', 'enqova'
    $updated = $updated -replace 'ENERGY_CCTV', 'ENQOVA'
    $updated = $updated -replace 'info@energycctv\.com', 'info@enqova.lk'
    $updated = $updated -replace 'sales@energycctv\.com', 'sales@enqova.lk'
    $updated = $updated -replace 'info@energycctv\.lk', 'info@enqova.lk'
    $updated = $updated -replace 'energy-cctv-pos', 'enqova-pos'

    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $updated, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $($file.FullName)"
    }
}
