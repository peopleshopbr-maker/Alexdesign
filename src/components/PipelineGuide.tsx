import React from 'react';
import { AddonConfig, RIG_PRESET_DEFINITIONS } from '../addon/blenderAddonTemplates';

interface PipelineGuideProps {
  config: AddonConfig;
}

const BONE_GROUPS = [
  { group: 'Humanoide (21 Ossos)', bones: 'pelvis · spine_01/02 · chest · neck · head · hair_dyn · braços e pernas completos' },
  { group: 'Bípede (16 Ossos)', bones: 'pelvis · spine · chest · neck · head · upper_arm/forearm/hand · thigh/shin/foot' },
  { group: 'Quadrúpede (20 Ossos)', bones: 'pelvis · spine_01/02 · chest · neck · head · tail_01/02 · 4 membros dianteiros/traseiros' },
];

export const PipelineGuide: React.FC<PipelineGuideProps> = ({ config }) => {
  const activeRig = RIG_PRESET_DEFINITIONS[config.rigPreset];

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 flex flex-col gap-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight text-balance">
          Fluxo Web PBR, Materiais e GLB/glTF
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Ambiente completo no navegador para importar modelos 3D, inspecionar UVs e integridade técnica, aplicar materiais procedurais PBR com os cinco mapas fundamentais, pintar diretamente sobre a malha e exportar em GLB/glTF.
        </p>
      </div>

      {/* 4-Step Site Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="text-xs font-mono text-orange-400">01. Importação &amp; Auditoria GLB/glTF</div>
          <h3 className="text-lg font-semibold text-white">Leitura Binária e Verificação Técnica</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Arraste arquivos <code className="text-slate-200">.glb</code> ou pacotes <code className="text-slate-200">.gltf + .bin + texturas</code> na Viewport 3D. O auditor valida cabeçalho glTF 2.0, canais UV0/UV2, vetores normais, materiais PBR e clipes de animação com relatório JSON exportável.
          </p>
        </section>

        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="text-xs font-mono text-orange-400">02. Materiais Procedurais &amp; Smart Materials</div>
          <h3 className="text-lg font-semibold text-white">5 Mapas Fundamentais PBR</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Na aba <strong>Ecossistema &amp; Materiais</strong>, ajuste desgaste, densidade, rachaduras, poeira em bordas e ferrugem em reentrâncias em tempo real para sintetizar <strong>Base Color</strong>, <strong>Roughness</strong>, <strong>Metallic</strong>, <strong>Normal/Height</strong> e <strong>Ambient Occlusion</strong>.
          </p>
        </section>

        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="text-xs font-mono text-orange-400">03. Pintura 3D &amp; Aplicação por Peça</div>
          <h3 className="text-lg font-semibold text-white">Raycasting UV e Texturas Customizadas</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Abra <strong>Materiais &amp; Pintura</strong> na Viewport 3D para atribuir presets PBR (Tecido, Couro, Metal, Ouro, Cerâmica, Borracha) clicando em cada peça, carregar mapas individuais ou pintar pinceladas diretamente sobre o canvas UV do modelo.
          </p>
        </section>

        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="text-xs font-mono text-orange-400">04. Rigs Padronizados &amp; Exportação GLB/glTF</div>
          <h3 className="text-lg font-semibold text-white">Pré-visualização Esquelética &amp; Exportação</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Alterne entre as estruturas <strong>Humanoide (21)</strong>, <strong>Bípede (16)</strong> e <strong>Quadrúpede (20)</strong> para validar proporções e poses animadas antes de exportar o ativo com materiais e pinturas preservados em <code className="text-slate-200">.glb</code> ou <code className="text-slate-200">.gltf</code>.
          </p>
        </section>
      </div>

      {/* Rig Hierarchy Reference + Workflow Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl bg-[#141923] border border-slate-800 p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-white">Predefinições de Rig na Viewport</h3>
            <span className="text-xs font-mono text-orange-400">Ativo: {activeRig.label}</span>
          </div>
          <div className="divide-y divide-slate-800/80 text-sm">
            {BONE_GROUPS.map((row) => (
              <div key={row.group} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-medium text-slate-200 whitespace-nowrap">{row.group}</span>
                <span className="font-mono text-xs text-slate-400">{row.bones}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-4">
          <h3 className="text-base font-semibold text-white">Fluxo Recomendado no Site</h3>
          <ol className="flex flex-col gap-3 text-sm text-slate-300 list-decimal list-inside">
            <li>Clique em <strong>Importar GLB/ZIP</strong> na Viewport 3D ou use <strong>Exemplo</strong>.</li>
            <li>Alterne ambientes em <strong>Ambiente HDRI</strong> e ajuste IBL, rotação e exposição.</li>
            <li>Configure mapas procedurais em <strong>Ecossistema &amp; Materiais</strong> ou pinte em <strong>Materiais &amp; Pintura</strong>.</li>
            <li>Inspecione as ilhas UV0/UV1 em <strong>Atlas &amp; UVs</strong> ({config.textureResolution}px).</li>
            <li>Exporte <strong>ZIP Completo</strong>, <strong>.glb</strong>, <strong>.gltf</strong> ou <strong>Render PNG</strong>.</li>
          </ol>
        </div>
      </div>

      {/* Python & Rust CLI Tools in Project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="text-xs font-mono text-orange-400">Python 3 · tools/python/alexdesign_pbr_tool.py</div>
          <h3 className="text-base font-semibold text-white">Pipeline PBR, Render Gate &amp; Cloudflare CLI</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Script em Python para auditar cabeçalhos <code className="text-slate-200">.glb</code>, verificar luminância/cobertura de renders PNG, empacotar ZIPs e validar a pasta <code className="text-slate-200">dist/</code> antes do deploy no Cloudflare Pages.
          </p>
          <pre className="mt-auto rounded-lg bg-[#0D1017] border border-slate-800 p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
            {`python tools/python/alexdesign_pbr_tool.py audit-glb modelo.glb --json\npython tools/python/alexdesign_pbr_tool.py verify-cloudflare`}
          </pre>
        </section>

        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="text-xs font-mono text-sky-400">Rust · tools/rust/src/main.rs</div>
          <h3 className="text-base font-semibold text-white">Auditor Binário GLB em Rust (Zero Dependências)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Binário nativo em Rust (<code className="text-slate-200">alexdesign-glb-cli</code>) para leitura ultrarrápida de chunks glTF 2.0, detecção de UVs, normais, PBR e extensões Draco/KTX2/Meshopt.
          </p>
          <pre className="mt-auto rounded-lg bg-[#0D1017] border border-slate-800 p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
            {`cd tools/rust && cargo build --release\n./target/release/alexdesign-glb-cli modelo.glb --json`}
          </pre>
        </section>
      </div>
    </div>
  );
};
