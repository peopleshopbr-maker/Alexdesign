# AlexDesign Rust Core

Núcleo em Rust + WebAssembly responsável por:
1. **Validação blindada de GLB/glTF** antes do Three.js renderizar.
2. **Máquina de estados de comandos** — decide se a cena permite cada ação.
3. **Gate contra cliques duplos e corridas** durante importação.

## Build (wasm-pack)

```powershell
# 1. Instale o Rust + wasm32 target (uma única vez)
rustup target add wasm32-unknown-unknown

# 2. Instale o wasm-pack
cargo install wasm-pack

# 3. Compile (dentro de rust-core/)
cd rust-core
wasm-pack build --target web --out-dir pkg --release

# 4. Pronto — o Vite importará dinamicamente rust-core/pkg/alexdesign_rust_core.js
```

## Modo degradado

Se o build WASM não existir (ou o navegador não suportar WASM), a ponte
`src/wasm/rustBridge.ts` entra automaticamente em modo **fallback TypeScript**
com as mesmas regras de decisão. Nenhuma falha derruba a aplicação.

## ⚠ Codificação

Salve `Cargo.toml` e `src/lib.rs` em **UTF-8 SEM BOM**. Arquivos com BOM
quebram o `rustc`/`cargo` com erro de parsing no primeiro token.
