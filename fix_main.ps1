$file = 'c:\Users\jhona\OneDrive\Documentos\gestaoengenhariatelegram\dashboard\src\App.jsx'
$content = Get-Content $file -Raw
$old = "padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}"
$new = "padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}"
$content = $content.Replace($old, $new)
Set-Content $file -Value $content -NoNewline
Write-Host "Done - replacements: $(($content -split [regex]::Escape($new)).Count - 1)"
