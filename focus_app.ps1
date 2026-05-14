Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Find AI Companion window
$windows = [System.Windows.Forms.Screen]::AllScreens
$found = $false

# Try to find by process
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne "" }
foreach ($p in $procs) {
    if ($p.ProcessName -like "*ai-companion*") {
        Write-Host "Found window: $($p.MainWindowTitle) - PID $($p.Id)"
        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host "AI Companion window not found"
    exit 1
}

# Wait for window to be ready
Start-Sleep -Milliseconds 500

# Capture
$bmp = New-Object System.Drawing.Bitmap(1920, 1080)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen([System.Drawing.Point]::Empty, [System.Drawing.Point]::Empty, [System.Drawing.Size]::new(1920, 1080))
$bmp.Save("C:\Users\asus\ai-companion\screenshot.png")
$g.Dispose()
$bmp.Dispose()
Write-Host "Screenshot saved"
