Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get window handle for AI Companion
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    public const uint BM_CLICK = 0x00F5;
}
"@

# Find the Tauri window
$hwnd = [Win32]::FindWindow("C:/Users/asus/ai-companion/apps/desktop/src-tauri/target/release/ai-companion-desktop.exe", $null)
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Output "Window not found by class, trying by title..."
    $hwnd = [Win32]::FindWindow($null, "AI Companion")
}
Write-Output "HWND: $hwnd"

# Bring to front
[Win32]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 300

# Click the settings button (top-left corner of the app window)
# The button is at roughly (2+16, 2+16) relative to window origin
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
}
"@

# Click at settings button position (around 34, 34)
[Mouse]::SetCursorPos(34, 34)
Start-Sleep -Milliseconds 100
[Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
[Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
Write-Output "Clicked settings button"

Start-Sleep -Milliseconds 500

# Take screenshot
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)

$outPath = "C:\Users\asus\ai-companion\logs\screenshots\settings-scheduler.png"
$bmp.Save($outPath)
$g.Dispose()
$bmp.Dispose()
Write-Output "saved: $outPath"
