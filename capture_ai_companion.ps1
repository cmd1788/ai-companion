param([string]$WindowTitle = "AI Companion", [string]$OutFile = "C:\Users\asus\ai-companion\app_capture.png")
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
public class WindowCap {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
    [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public const int SRCCOPY = 0x00CC0020;
    public const int SW_RESTORE = 9;
}
"@

$hwnd = [WindowCap]::FindWindow($null, $WindowTitle)
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "Window not found"; exit 1 }
Write-Host "Found: $hwnd"

[WindowCap]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 500

$rect = New-Object WindowCap+RECT
[WindowCap]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
$w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
Write-Host "Size: $w x $h"

$srcDC = [Graphics]::FromHwnd($hwnd).GetHdc()
$memDC = [WindowCap]::CreateCompatibleDC($srcDC)
$hBitmap = [WindowCap]::CreateCompatibleBitmap($srcDC, $w, $h)
[WindowCap]::SelectObject($memDC, $hBitmap) | Out-Null
[WindowCap]::BitBlt($memDC, 0, 0, $w, $h, $srcDC, 0, 0, [WindowCap]::SRCCOPY) | Out-Null

$bitmap = Bitmap::FromHBitmap($hBitmap)
$bitmap.Save($OutFile, [Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
[WindowCap]::DeleteObject($hBitmap) | Out-Null
[WindowCap]::DeleteDC($memDC) | Out-Null
Write-Host "Saved to $OutFile"
