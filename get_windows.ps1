Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 10 Name,Id,MainWindowTitle | Format-Table -AutoSize
