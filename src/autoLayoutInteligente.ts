function calcularPrioridadeBotoes(ocupacao: number, degenerados: number): string[] {
    if (degenerados > 0 || ocupacao < 40) {
        return ['btn-gerar-uv', 'btn-importar-textura', 'btn-exportar-png', 'btn-exportar-zip'];
    }
    if (ocupacao >= 75) {
        return ['btn-exportar-zip', 'btn-exportar-png', 'btn-importar-textura', 'btn-gerar-uv'];
    }
    return ['btn-importar-textura', 'btn-gerar-uv', 'btn-exportar-png', 'btn-exportar-zip'];
}

function extrairMetricasDaTela() {
    const textoPagina = document.body.innerText || '';
    
    const matchDegenerados = textoPagina.match(/Degenerados:\s*(\d+)/i);
    const matchOcupacao = textoPagina.match(/Ocupa.ao\s*UV\s*(\d+(?:[.,]\d+)?)%/i);
    const matchFora = textoPagina.match(/Fora\s*0..1:\s*(\d+)/i);

    const degenerados = matchDegenerados ? parseInt(matchDegenerados[1], 10) : 0;
    const ocupacao = matchOcupacao ? parseFloat(matchOcupacao[1].replace(',', '.')) : 0;
    const foraEspaco = matchFora ? parseInt(matchFora[1], 10) : 0;

    return { ocupacao, degenerados, foraEspaco };
}

function adequarTelaUVAutomaticamente() {
    // 1. Remove limites estreitos de largura (max-w-5xl, max-w-6xl, etc.) dos containers principais
    const containersLimitados = document.querySelectorAll('main, section, div[class*="max-w-"]');
    containersLimitados.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.innerText && htmlEl.innerText.includes('Estrutura de UVs')) {
            htmlEl.style.maxWidth = '98vw';
            htmlEl.style.width = '100%';
            htmlEl.style.paddingLeft = '16px';
            htmlEl.style.paddingRight = '16px';
        }
    });

    // 2. Localiza o card "Malha UV (UV)" e faz ele ocupar todo o espaco restante da tela
    const titulos = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div'));
    const headerMalhaUV = titulos.find(el => el.textContent && el.textContent.trim() === 'Malha UV (UV)');

    if (headerMalhaUV) {
        // Sobe ate encontrar o card principal do visualizador UV
        let cardUV = headerMalhaUV.parentElement;
        while (cardUV && cardUV.parentElement && cardUV.clientHeight < 300) {
            cardUV = cardUV.parentElement;
        }

        if (cardUV) {
            cardUV.style.flex = '1 1 auto';
            cardUV.style.width = '100%';
            cardUV.style.minHeight = '78vh';
            cardUV.style.display = 'flex';
            cardUV.style.flexDirection = 'column';

            // Ajusta o container pai (que segura a barra lateral + quadro UV) para usar tela cheia
            if (cardUV.parentElement) {
                cardUV.parentElement.style.display = 'flex';
                cardUV.parentElement.style.flexWrap = 'nowrap';
                cardUV.parentElement.style.width = '100%';
                cardUV.parentElement.style.maxWidth = '100%';
                cardUV.parentElement.style.gap = '20px';
            }

            // Expande o canvas ou SVG da grade UV dentro do card
            const canvasUV = cardUV.querySelector('canvas, svg') as HTMLElement;
            if (canvasUV) {
                canvasUV.style.width = '100%';
                canvasUV.style.height = '100%';
                canvasUV.style.minHeight = '68vh';
                canvasUV.style.objectFit = 'contain';
            }
        }
    }
}

export async function sincronizarLayoutComRust() {
    try {
        adequarTelaUVAutomaticamente();

        const { ocupacao, degenerados, foraEspaco } = extrairMetricasDaTela();
        const prioridades = calcularPrioridadeBotoes(ocupacao, degenerados);

        const mapaTextos: Record<string, string> = {
            'btn-gerar-uv': 'Gerar UV Auto',
            'btn-importar-textura': 'Importar Textura',
            'btn-exportar-png': 'Exportar PNG',
            'btn-exportar-zip': 'Exportar ZIP'
        };

        const todosBotoes = Array.from(document.querySelectorAll('button'));

        prioridades.forEach((chave: string, indice: number) => {
            const textoAlvo = mapaTextos[chave.trim()];
            const botaoEncontrado = todosBotoes.find(b => b.textContent && b.textContent.includes(textoAlvo));

            if (botaoEncontrado) {
                if (botaoEncontrado.parentElement) {
                    botaoEncontrado.parentElement.style.display = 'flex';
                    botaoEncontrado.parentElement.style.flexWrap = 'wrap';
                    botaoEncontrado.parentElement.style.gap = '8px';
                }

                botaoEncontrado.style.order = indice.toString();
                botaoEncontrado.style.transition = 'all 0.25s ease';

                if (indice === 0) {
                    botaoEncontrado.style.outline = '2px solid #f97316';
                    botaoEncontrado.style.boxShadow = '0 0 14px rgba(249, 115, 22, 0.65)';
                } else {
                    botaoEncontrado.style.outline = 'none';
                    botaoEncontrado.style.boxShadow = 'none';
                }
            }
        });

        const abasOrdem = (degenerados > 1000 || foraEspaco > 0)
            ? ['UVs', 'Viewport 3D', 'Ecossistema & Materiais']
            : (ocupacao >= 75 ? ['Ecossistema & Materiais', 'Viewport 3D', 'UVs'] : ['Viewport 3D', 'UVs', 'Ecossistema & Materiais']);

        abasOrdem.forEach((nomeAba, pos) => {
            const btnAba = todosBotoes.find(b => b.textContent && b.textContent.trim() === nomeAba);
            if (btnAba) {
                if (btnAba.parentElement) {
                    btnAba.parentElement.style.display = 'flex';
                }
                btnAba.style.order = pos.toString();
            }
        });
    } catch (erro) {
        console.warn('Auto-Layout Rust aguardando inicializacao:', erro);
    }
}

export function iniciarMonitoramentoAutomatico() {
    setTimeout(sincronizarLayoutComRust, 500);

    // Reajusta automaticamente sempre que a janela mudar de tamanho
    window.addEventListener('resize', adequarTelaUVAutomaticamente);

    const observador = new MutationObserver(() => {
        sincronizarLayoutComRust();
    });

    observador.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}