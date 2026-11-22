# View3D Persistente em Todas as Abas (Remoção da Aba Materiais PBR)

Manter o Viewport 3D WebGL ao vivo permanentemente visível e interativo à esquerda em todas as abas ativas do estúdio (**Estúdio 3D**, **Rig & Anim**, **Luz & Render**, **Variáveis**, **Fluxo 3D** e **Exportar**), replicando o mesmo padrão espacial de tela dividida da aba **Estúdio 3D**, e **removendo a aba dedicada "Materiais PBR"** da navegação e do fluxo de trabalho.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Confirmadas pelo Usuário**:
> 1. **Layout Padrão Estúdio 3D em Todas as Abas**: `View3D` interativo à esquerda + painel da aba ativa à direita.
> 2. **Remoção da Aba Materiais PBR**: A aba **"Materiais PBR"** será removida da barra de navegação superior, do roteamento de abas, da busca rápida e dos atalhos do Fluxo 3D.

- **Abas Mantidas no Estúdio**: **Estúdio 3D**, **Rig & Anim**, **Luz & Render**, **Variáveis**, **Fluxo 3D** e **Exportar**.
- **Edição Rápida de Aparência no Inspetor**: Os controles diretos de cor, shader, roughness, metalness e pintura continuam integrados ao inspetor do **Estúdio 3D** quando o usuário seleciona uma malha na cena, sem aba separada de Materiais PBR.
- **Persistência Única da Instância WebGL**: O canvas Three.js permanece montado em um único container contínuo à esquerda (nunca ocultado com `display: none` nem recriado entre trocas de aba), preservando modelo, esqueleto, luzes, HDRI, câmera e histórico de Undo/Redo sem flicker ou perda de contexto WebGL.
- **Redimensionamento & Recolhimento**: O painel direito conta com alternância de largura (compacta/expandida) e botão para recolher temporariamente, dando 100% da área ao View3D quando necessário.

---

## 1. Overview & Core Concept

- **O Que Faz**: Simplifica a navegação removendo a aba **Materiais PBR** e transforma todas as abas restantes (**Rig & Anim**, **Luz & Render**, **Variáveis**, **Fluxo 3D** e **Exportar**) em painéis laterais acoplados ao lado do Viewport 3D ao vivo.
- **Público-Alvo**: Designers 3D, animadores e desenvolvedores WebGL que desejam uma interface direta, sem abas redundantes, vendo cada ajuste de rig, luz, variável ou auditoria em tempo real no modelo 3D.
- **Principal Valor**: Fluxo mais enxuto (menos abas) aliado à visualização instantânea de toda edição diretamente na cena 3D.

---

## 2. User Experience & Visual Design

### Fluxos Principais do Usuário
1. **Barra Superior Enxuta**: Exibe apenas **Estúdio 3D**, **Rig & Anim**, **Luz & Render**, **Variáveis**, **Fluxo 3D** e o botão **Exportar** (sem a aba Materiais PBR).
2. **Navegação Contínua com View3D ao Vivo**:
   - **Estúdio 3D**: Layout padrão com View3D à esquerda e Inspetor de Estágios à direita.
   - **Rig & Anim**: View3D à esquerda (com marcadores 3D, ossos X-Ray, Pose Mode, Clay e nome do osso) + painel ActionForge (presets, postura aditiva, biblioteca de 84 clipes e sequencer NLA) à direita.
   - **Luz & Render**: View3D à esquerda refletindo em tempo real HDRI, luzes de 3 pontos, tone mapping ACES/AgX e exposição configurados no painel direito.
   - **Variáveis**: View3D à esquerda respondendo imediatamente à velocidade, escala global, grade, wireframe e cor de destaque editados à direita.
   - **Fluxo 3D**: View3D à esquerda + guia interativo de etapas à direita (atualizado sem referências à aba Materiais PBR).
   - **Exportar**: View3D à esquerda + cartões Blender 5.3+ (.ZIP), PNG Fundo Transparente, .GLB, .glTF, código Blender/Web e auditoria técnica à direita.
3. **Mobile / Telas Estreitas**: Em telas abaixo de `lg`, o View3D permanece fixo no topo com altura útil confortável para toque e o painel da aba ativa rola logo abaixo.

### Identidade Visual, Espaçamento & Tipografia
- **Direção Estética**: Estúdio 3D dark mode contínuo (`#0D1017` no canvas WebGL, `#111622` no painel direito, `#141923` nos blocos internos, bordas `border-slate-800`, acento funcional `#f97316` e números em `font-mono tabular-nums`).
- **Contenção & Clareza**:
  - Viewport 3D ocupa `flex-1 min-w-0 h-full` sem scrollbars externas ou bordas quebradas.
  - HUD flutuante sobre o canvas (`z-10`) mantém controles de câmera, gizmo, Clay e nome do osso sempre acessíveis e legíveis sem obstruir o modelo.
  - Segurança WebGL garantida com listeners de `webglcontextlost` e `webglcontextrestored` e fallback visual amigável caso o contexto suspenda.
  - Painéis das abas adaptados para coluna lateral (`w-full`, grids de 1 a 2 colunas conforme largura, sem `max-w-[1360px]` desperdiçando espaço nem estouro horizontal).
  - Controles em linha única (`whitespace-nowrap shrink-0`) e zero pílulas decorativas em metadados.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Remoção Completa da Aba Materiais PBR**
  - *Abordagem Escolhida*: Remover a aba **Materiais PBR** da navegação principal, do estado de rota ativa, dos resultados do Command Palette (`Ctrl+K`) e dos links do `Fluxo 3D` / botão interno de Material no inspetor do Estúdio 3D.
  - *Por Quê*: Atende diretamente à solicitação do usuário de enxugar o estúdio, evitando uma aba extra redundante enquanto a edição direta de cor, roughness, metalness, pintura 3D e shader continua acessível no inspetor do objeto selecionado dentro do próprio Estúdio 3D.
  - *Alternativas Descartadas*: Apenas esconder o botão no cabeçalho mantendo links quebrados na busca rápida ou no guia de fluxo.

- **Decisão 2: Instância Única Persistente do Viewport 3D**
  - *Abordagem Escolhida*: Manter um único componente de Viewport 3D montado na coluna esquerda em todas as abas, alternando apenas o painel acoplado à direita.
  - *Por Quê*: Evita recriar o renderer Three.js, preserva ossos/rig, clipes ativos, câmera e histórico de Undo/Redo com transição imediata entre abas.
  - *Alternativas Descartadas*: Criar instâncias separadas de WebGL por aba (alto custo de GPU e perda de sincronização).

- **Decisão 3: Largura Contextual & Botão Expandir/Recolher do Painel Direito**
  - *Abordagem Escolhida*: No **Estúdio 3D**, o inspetor usa largura compacta (`~370px–400px`). Nas demais abas (`Rig & Anim`, `Luz & Render`, `Variáveis`, `Fluxo 3D`, `Exportar`), o painel direito usa largura lateral confortável (`~480px–560px` em telas largas) com botão para alternar largura ampla/compacta ou recolher, mantendo o View3D como protagonista à esquerda.
  - *Por Quê*: Garante boa legibilidade da grade de animações ActionForge, curvas e código Blender 5.3 sem sacrificar a área do canvas 3D.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Logo | Undo/Redo | Estúdio 3D · Rig & Anim · Luz · Variáveis · Fluxo│
│                                                                 [ Exportar ] │
├───────────────────────────────────────┬──────────────────────────────────────┤
│                                       │                                      │
│   Viewport 3D Persistente (flex-1)    │  Painel Direito Dinâmico             │
│   ───────────────────────────────     │  ───────────────────────             │
│   · Canvas WebGL único sempre ativo   │  Se aba == Estúdio 3D:               │
│   · ResizeObserver ajusta câmera      │   └─ Inspetor de Estágios integrado  │
│   · webglcontextlost/restored seguro  │                                      │
│   · HUD Flutuante (Hierarquia, Gizmo, │  Se aba == Rig / Luz / Variáveis /   │
│     Câmera, Clay, Osso selecionado)   │            Fluxo 3D / Exportar:      │
│                                       │   ├─ Barra: Compactar/Expandir/Ocult.│
│                                       │   └─ Conteúdo da aba com scroll      │
│                                       │      interno independente            │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

### Estratégia de Estado & Sincronização
- **Fonte Única de Verdade da Cena**: Estado WebGL centralizado no motor do Viewport 3D e sincronizado via snapshot e ações globais com as abas acopladas (**Rig & Anim**, **Luz & Render**, **Variáveis**, **Exportar**).
- **Limpeza Consistente de Navegação**: Remoção de referências à rota de Materiais PBR na navegação superior, nos passos do guia (`Fluxo 3D`), no inspetor de estágio 4 e na paleta de comandos (`Ctrl+K`), garantindo que nenhuma aba ou atalho aponte para destino removido.
- **Refluxo Automático (`ResizeObserver`)**: Mudanças de largura ao alternar entre o inspetor do Estúdio 3D e os painéis das abas (ou recolher o painel) atualizam automaticamente a proporção da câmera e do renderer sem distorção.
