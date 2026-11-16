
// --- AUTO-REORGANIZACAO DE BOTOES VIA RUST/WASM ---
export function aplicarLayoutInteligente(wasmModule, ocupacao, degenerados) {
    if (!wasmModule || !wasmModule.calcular_prioridade_botoes) return;

    const ordem = wasmModule.calcular_prioridade_botoes(ocupacao, degenerados).split(',');
    
    ordem.forEach((id, index) => {
        const btn = document.getElementById(id.trim());
        if (btn) {
            btn.style.order = index;
            if (index === 0) {
                btn.classList.add('ui-destaque-urgente');
            } else {
                btn.classList.remove('ui-destaque-urgente');
            }
        }
    });
}