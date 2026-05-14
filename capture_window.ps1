Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get the AI Companion window by title
Add-Type @"
using System;
using System.Runtime.Interop;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

$hwnd = [Win32]::FindWindow($null, "AI Companion")
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Host "Window not found"
    exit 1
}

Write-Host "Found window handle: $hwnd"

# Set foreground
[Win32]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 300

# Get window rect
$rect = New-Object Win32+RECT
[Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
Write-Host "Window rect: $($rect.Left), $($rect.Top), $($rect.Right), $($rect.Bottom)"

# Calculate size
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

if ($width -le 0 -or $height -le 0) {
    Write-Host "Invalid window size"
    exit 1
}

# Capture
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, [System.Drawing.Size]::new($width, $height))
$bmp.Save("C:\Users\asus\ai-companion\window_capture.png")
$g.Dispose()
$bmp.Dispose()
Write-Host "Window capture saved to window_capture.png"
