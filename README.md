# AlexDesign — Estúdio 3D Web, Pipeline PBR & Add-on Blender

Plataforma web de visualização, escultura, pintura PBR, auto-rigging e preparação de ativos 3D em tempo real, construída com **React**, **TypeScript**, **Three.js**, **Vite** e processamento geométrico de alta performance em **Rust / WebAssembly (`rust-core`)**.

---

## 1. Arquitetura do Projeto

```text
Alexdesign-main/
├── public/                         # Assets estáticos, amostras (.glb) e decoders Draco/Basis
├── rust-core/                      # Núcleo nativo em Rust compilado para WebAssembly (.wasm)
│   └── src/lib.rs                  # Processamento de malhas, simetria e cálculos geométricos
├── src/
│   ├── addon/
│   │   └── blenderAddonTemplates.ts  # Gerador dinâmico do Add-on Python para Blender (3.5 a 5.3)
│   ├── components/
│   │   ├── Viewport3D.tsx          # Canvas Three.js, ferramentas de escultura, pintura e histórico
│   │   ├── PipelineGuide.tsx       # Guia interativo das etapas do pipeline na interface
│   │   ├── AtlasUvInspector.tsx    # Inspetor de mapas UV e densidade de texel
│   │   ├── HdriEnvironmentPanel.tsx # Iluminação baseada em imagem (HDRI)
│   │   ├── LightingRenderPanel.tsx  # Configuração de luzes e renderização PNG transparente
│   │   └── FileVerificationModal.tsx # Auditoria estrutural de arquivos 3D importados
│   ├── types/
│   │   └── studioConfig.ts         # Definições de tipos, presets de Rig e configurações padrão
│   ├── utils/
│   │   ├── autoRigger.ts           # Geração automática de Armature, skinning e clipes de animação
│   │   ├── blenderPipelineGenerator.ts # Scripts de automação de materiais e bake para Blender
│   │   ├── substanceImporter.ts    # Importação de conjuntos de texturas PBR (Substance)
│   │   └── projectZipExporter.ts   # Empacotamento completo (.glb/.gltf + texturas + README)
│   └── wasm/
│       └── rust_core.d.ts          # Tipagens TypeScript da ponte WebAssembly
├── package.json                    # Dependências e scripts de build/auditoria
├── vite.config.ts                  # Configuração de empacotamento e chunks Three.js/WASM
└── wrangler.jsonc                  # Configuração de hospedagem no Cloudflare Pages
```

---

## 2. Pipeline 3D Detalhado

O fluxo de trabalho do **AlexDesign** é dividido em etapas integradas que permitem editar modelos livremente antes da exportação final:

1. **Importação e Validação (`FileVerificationModal`):**
   * Suporte para modelos `.glb`, `.gltf` e pacotes `.zip`, além do modelo de referência PBR (`DamagedHelmet.glb`).
   * Verificação automática de hierarquia de malhas, atributos de vértice, coordenadas UV e canais de textura.
2. **Modelagem, Escultura e Topologia (`Viewport3D` + `rust-core`):**
   * Adição de primitivas 3D, operações booleanas e templates paramétricos.
   * Ferramentas de escultura direta na malha, subdivisão de superfície e retopologia dinâmica com controle de proporção.
   * Histórico de desfazer (**Ctrl+Z** / **Cmd+Z**) para reverter pinceladas de escultura, subdivisões e retopologias.
3. **Mapeamento UV e Densidade de Texel (`AtlasUvInspector`):**
   * Geração automática de UVs com controle de margem (`uvMargin`), ângulo de costura (`seamAngleDeg`) e densidade de texel (`texelDensity`).
   * Visualização com grade de verificação (*checkerboard*) para identificar distorções.
4. **Materiais PBR, Texturização e Pintura (`substanceImporter`):**
   * Suporte completo a fluxos PBR (*Base Color*, *Roughness*, *Metalness*, *Normal Map*, *Ambient Occlusion*).
   * Pintura direta em canvas sobre a malha 3D com pilha de histórico dedicada (**Ctrl+Z**).
5. **Auto-Rigging e Animação (`autoRigger` + `studioConfig`):**
   * Geração automática de esqueleto (*Armature*) e pesos de vértice com 3 predefinições estruturais:
     * **`OBJETO` (3 Ossos):** Armadura leve (`root_base`, `center_ctrl`, `top_tip`) ideal para capacetes (*Helmet*), armas e props 3D.
     * **`BIPEDE` (16 Ossos):** Estrutura articulada para personagens bípedes.
     * **`QUADRUPEDE` (20 Ossos):** Estrutura articulada para criaturas e animais quadrúpedes.
   * Geração de clipes de animação de teste (`Test_Rig_Animation`) para validar deformações em tempo real.
6. **Iluminação HDRI, Render e Exportação (`projectZipExporter` + Add-on Blender):**
   * Iluminação de estúdio customizável, ambientes HDRI e captura de render PNG com fundo transparente.
   * Exportação em `.glb`, `.gltf` ou pacote `.zip` completo contendo o modelo, texturas e um **Add-on Python compatível com Blender 3.5 a 5.3** para reproduzir materiais e bake automaticamente.

---

## 3. Atalhos de Teclado no Estúdio

| Atalho | Ação |
| :--- | :--- |
| **`Ctrl + Z`** (ou `Cmd + Z`) | Desfaz a última alteração de escultura/malha ou pincelada de pintura 3D |
| **`Esc`** | Fecha janelas modais de verificação ou exportação |
| **Botão Esquerdo + Arrastar** | Orbita a câmera ao redor do ativo 3D |
| **Botão Direito + Arrastar** | Move a câmera lateralmente (*Pan*) |
| **Scroll do Mouse** | Aproxima ou afasta o zoom |

---

## 4. Comandos de Desenvolvimento, Auditoria e Publicação

Execute os comandos abaixo dentro da pasta `Alexdesign-main`:

### Iniciar servidor local de desenvolvimento
```powershell
npm run dev
```

### Auditoria completa (Rust Clippy + TypeScript + Build Vite)
Verifica regras estritas de memória e lógica no Rust, valida tipagem TypeScript em todo o front-end e compila o pacote de produção:
```powershell
npm run check:all
```

### Publicar no Cloudflare Pages
```powershell
npx wrangler pages deploy dist --project-name=alexdesign-design --commit-dirty=true
```
