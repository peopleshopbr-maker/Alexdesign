param(
    [string]$CommitMsg = "Atualiza AlexDesign Studio (Tema Bege UX)"
)

Write-Host "=== 1. VERIFICANDO TYPESCRIPT E BUILD ===" -ForegroundColor Cyan
npx tsc --noEmit --pretty
if ($LASTEXITCODE -ne 0) { exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "=== 2. SINCRONIZANDO COM GITHUB ===" -ForegroundColor Cyan
git add -A
git commit -m "$CommitMsg" --allow-empty
git push -u origin main

Write-Host "=== 3. PUBLICANDO NO CLOUDFLARE PAGES ===" -ForegroundColor Cyan
# Limpa token inválido da sessão para usar o login nativo do Wrangler (ou .env.local se válido)
Remove-Item Env:\CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
npx wrangler pages deploy dist --project-name=alexdesign

Write-Host "`n[SUCESSO] Local, GitHub e Cloudflare atualizados!" -ForegroundColor Green
