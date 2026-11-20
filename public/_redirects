# ============================================================
#  Corrige o _redirects (loop infinito) e adiciona fallback SPA
#  Repo: peopleshopbr-maker/Alexdesign
# ============================================================

# 1) Vá para a pasta do repositório (ajuste o caminho)
Set-Location "C:\Users\SEU_USUARIO\Alexdesign"

# 2) Garante que está atualizado
git pull origin main

# 3) Localiza o _redirects (public/ tem prioridade)
$file = @("public\_redirects", "_redirects") |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1

if (-not $file) {
    Write-Host "Nenhum _redirects encontrado. Criando public\_redirects..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "public" | Out-Null
    $file = "public\_redirects"
    Set-Content -Path $file -Value "" -Encoding utf8
}

Write-Host "Editando: $file" -ForegroundColor Cyan

# 4) Remove a linha que gera loop infinito
$pattern = '^\s*/\*\s+/index\.html\s+200\s*$'
$original = Get-Content -Path $file
$limpo = $original | Where-Object { $_ -notmatch $pattern }

if ($original.Count -eq $limpo.Count) {
    Write-Host "A linha '/* /index.html 200' nao foi encontrada - nada a remover." -ForegroundColor Yellow
} else {
    Write-Host "Linha de loop removida." -ForegroundColor Green
}

# Grava em UTF-8 sem BOM
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines((Resolve-Path $file).Path, $limpo, $utf8)

# 5) Cria o fallback de SPA (404.html)
$fallback = @'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Alexdesign</title>
  <script>
    sessionStorage.setItem("spa_redirect", location.pathname + location.search);
    location.replace("/");
  </script>
</head>
<body></body>
</html>
'@

New-Item -ItemType Directory -Force -Path "public" | Out-Null
[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location).Path "public\404.html"),
    $fallback,
    $utf8
)
Write-Host "public\404.html criado." -ForegroundColor Green

# 6) Mostra o que mudou antes de commitar
git --no-pager diff --stat

# 7) Commit e push (dispara o build no Cloudflare Pages)
git add $file "public\404.html"
git commit -m "fix: remove redirect com loop infinito e adiciona fallback SPA"
git push origin main

Write-Host "`nPush concluido. O build de producao deve iniciar em segundos." -ForegroundColor Green
