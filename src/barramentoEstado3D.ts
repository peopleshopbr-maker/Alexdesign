// Barramento Central de Estado 3D - Sincroniza Viewport3D, UVs e Materiais PBR
export interface EstadoCena3D {
    modeloAtual: any | null;
    malhas: any[];
    uvAtualizada: boolean;
    materiaisAtivos: any[];
    texturasPBR: Record<string, string>;
    ultimaAtualizacao: number;
}

declare global {
    interface Window {
        __ALEXDESIGN_STATE__?: EstadoCena3D;
        sincronizarAbas3D?: (dadosParciais: Partial<EstadoCena3D>) => void;
    }
}

export function inicializarBarramento3D() {
    if (!window.__ALEXDESIGN_STATE__) {
        window.__ALEXDESIGN_STATE__ = {
            modeloAtual: null,
            malhas: [],
            uvAtualizada: false,
            materiaisAtivos: [],
            texturasPBR: {},
            ultimaAtualizacao: Date.now()
        };
    }

    window.sincronizarAbas3D = (dadosParciais: Partial<EstadoCena3D>) => {
        window.__ALEXDESIGN_STATE__ = {
            ...window.__ALEXDESIGN_STATE__!,
            ...dadosParciais,
            ultimaAtualizacao: Date.now()
        };

        // Dispara evento global para atualizar UVs e Ecossistema & Materiais instantaneamente
        window.dispatchEvent(new CustomEvent('alexdesign:cena-atualizada', {
            detail: window.__ALEXDESIGN_STATE__
        }));
    };

    // Intercepta cliques nas abas UVs e Ecossistema & Materiais para forcar sincronizacao dos dados do Viewport3D
    document.addEventListener('click', (e) => {
        const alvo = e.target as HTMLElement;
        const texto = alvo?.textContent?.trim();

        if (texto === 'UVs' || texto === 'Ecossistema & Materiais') {
            window.dispatchEvent(new CustomEvent('alexdesign:aba-ativada', {
                detail: {
                    aba: texto,
                    estadoAtual: window.__ALEXDESIGN_STATE__
                }
            }));
        }
    });
}