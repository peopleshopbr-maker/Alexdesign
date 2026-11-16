import initWasm, * as wasmCore from './wasm/rust_core.js';

let wasmPronto = false;

async function garantirWasm() {
    if (!wasmPronto) {
        await initWasm();
        wasmPronto = true;
    }
}

function extrairMetricasDaTela() {
    const textoPagina = document.body.innerText || '';
    
    const matchDegenerados = textoPagina.match(/Degenerados:\s*(\d+)/i);
    const matchOcupacao = textoPagina.match(/Ocupa.ao\s*UV\s*(\d+(?:[.,]\d+)?)%/i);

    const degenerados = matchDegenerados ? parseInt(matchDegenerados[1], 10) : 0;
    const ocupacao = matchOcupacao ? parseFloat(matchOcupacao[1].replace(',', '.')) : 0;

    return { ocupacao, degenerados };
}

export async function sincronizarLayoutComRust() {
    try {
        await garantirWasm();
        if (!wasmCore.calcular_prioridade_botoes) return;

        const { ocupacao, degenerados } = extrairMetricasDaTela();
        const ordemString = wasmCore.calcular_prioridade_botoes(ocupacao, degenerados);
        const prioridades = ordemString.split(',');

        const mapaTextos: Record<string, string> = {
            'btn-gerar-uv': 'Gerar UV Auto',
            'btn-importar-textura': 'Importar Textura',
            'btn-exportar-png': 'Exportar PNG',
            'btn-exportar-zip': 'Exportar ZIP'
        };

        const todosBotoes = Array.from(document.querySelectorAll('button'));

        prioridades.forEach((chave, indice) => {
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
    } catch (erro) {
        console.warn('Auto-Layout Rust aguardando inicializacao:', erro);
    }
}

export function iniciarMonitoramentoAutomatico() {
    setTimeout(sincronizarLayoutComRust, 800);

    const observador = new MutationObserver(() => {
        sincronizarLayoutComRust();
    });

    observador.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}