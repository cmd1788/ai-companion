Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)

$outPath = "C:\Users\asus\ai-companion\logs\screenshots\verify-20260517.png"
$bmp.Save($outPath)
$g.Dispose()
$bmp.Dispose()
Write-Output "saved: $outPath"
