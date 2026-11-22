Set-Location "C:\Users\studio alex\OneDrive\Documentos\Alexdesign"

function Show-Header {
    Clear-Host
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "        ALEXDESIGN 3D STUDIO - PAINEL CLI           " -ForegroundColor White
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host ""
}

do {
    Show-Header
    Write-Host " [1] Iniciar Servidor Local (npm run dev)" -ForegroundColor Green
    Write-Host " [2] Varrer Erros e Testar Build (tsc + vite build)" -ForegroundColor Yellow
    Write-Host " [3] Publicar Tudo (Check + Build + GitHub)" -ForegroundColor Cyan
    Write-Host " [4] Limpar Cache e Liberar Porta 3000" -ForegroundColor Magenta
    Write-Host " [5] Ver Status do Git e Ultimos Commits" -ForegroundColor Gray
    Write-Host " [6] Desfazer Alteracoes Nao Salvas (Reset)" -ForegroundColor Red
    Write-Host " [0] Sair" -ForegroundColor DarkGray
    Write-Host ""
    $opcao = Read-Host "Escolha uma opcao"

    switch ($opcao) {
        "1" {
            Write-Host "`nIniciando servidor na porta 3000..." -ForegroundColor Green
            npm run dev
            Pause
        }
        "2" {
            Write-Host "`nVerificando TypeScript..." -ForegroundColor Yellow
            npx tsc --noEmit --pretty
            if ($LASTEXITCODE -eq 0) {
                Write-Host "TypeScript OK! Gerando build..." -ForegroundColor Green
                npm run build
            }
            Pause
        }
        "3" {
            Write-Host "`nValidando codigo antes de publicar..." -ForegroundColor Cyan
            npx tsc --noEmit --pretty
            if ($LASTEXITCODE -eq 0) {
                npm run build
                if ($LASTEXITCODE -eq 0) {
                    $msg = Read-Host "Digite a descricao da atualizacao (ou Enter para padrao)"
                    if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Atualizacao AlexDesign Studio" }
                    git remote set-url origin ("https://github.com" + [char]47 + "peopleshopbr-maker/Alexdesign.git")
                    git add -A
                    git commit -m $msg
                    git push -u origin main
                    Write-Host "`nSite publicado com sucesso no GitHub/Cloudflare!" -ForegroundColor Green
                }
            } else {
                Write-Host "`nPublicacao cancelada: corrija os erros acima primeiro." -ForegroundColor Red
            }
            Pause
        }
        "4" {
            Write-Host "`nLiberando porta 3000 e limpando cache..." -ForegroundColor Magenta
            Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
            Remove-Item -Recurse -Force dist, node_modules\.vite -ErrorAction SilentlyContinue
            Write-Host "Ambiente limpo!" -ForegroundColor Green
            Pause
        }
        "5" {
            Write-Host "`n--- STATUS ATUAL ---" -ForegroundColor Cyan
            git status -s
            Write-Host "`n--- ULTIMOS 5 COMMITS ---" -ForegroundColor Cyan
            git log --oneline -n 5
            Pause
        }
        "6" {
            $confirma = Read-Host "Tem certeza que deseja descartar alteracoes nao salvas? (S/N)"
            if ($confirma -eq "S" -or $confirma -eq "s") {
                git checkout -- .
                Write-Host "Arquivos restaurados para o ultimo commit." -ForegroundColor Yellow
            }
            Pause
        }
    }
} while ($opcao -ne "0")
