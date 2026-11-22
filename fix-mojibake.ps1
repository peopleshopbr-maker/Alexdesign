# Corrige mojibake (UTF-8 lido como Windows-1252) nos arquivos de src e index.html.
# Converte apenas os trechos corrompidos (ex.: "ConfiguraÃ§Ã£o" -> "Configuração").
# Só grava o arquivo se algo realmente mudou.
$utf8 = [System.Text.UTF8Encoding]::new($false)
$cp1252 = [System.Text.Encoding]::GetEncoding(1252)

# Um "Ã", "Â" ou "â" seguido de 1-2 caracteres não-ASCII costuma ser UTF-8 quebrado.
$pattern = '[ÃÂâ][^\x00-\x7F]{1,2}'

function Repair([string]$text) {
  [regex]::Replace($text, $pattern, {
    param($m)
    $candidate = $utf8.GetString($cp1252.GetBytes($m.Value))
    # Só aceita se decodificou limpo (sem U+FFFD) e ficou menor que o original.
    if ($candidate -notmatch [char]0xFFFD -and $candidate.Length -lt $m.Value.Length) { $candidate } else { $m.Value }
  })
}

$files = @(Get-ChildItem -Recurse -Include *.ts,*.tsx,*.html -Path src -ErrorAction SilentlyContinue) +
         @(Get-Item index.html)
$fixed = @()
foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName, $utf8)
  $new = Repair $text
  if ($new -ne $text) {
    [System.IO.File]::WriteAllText($f.FullName, $new, $utf8)
    $fixed += $f.Name
  }
}
Write-Output ("Corrigidos: " + ($fixed -join ', '))
