# Como adicionar um projeto

1. Coloque as imagens do projeto em `public/assets/`.
2. Abra `src/data/projects.ts` e copie um dos objetos dentro da lista `projects`.
3. Preencha os dados do novo projeto:
   - `slug`: endereço único, em minúsculas e com hífens, por exemplo `suporte-fone`.
   - `title`: nome que aparece no cartão e na página.
   - `category` e `year`: categoria e ano do projeto.
   - `cover`: caminho da imagem principal, por exemplo `/assets/suporte-fone.jpg`.
   - `description`, `material`, `dimensions`, `printType` e `function`: informações mostradas na ficha da página. Em `printType`, indique o processo de impressão; em `function`, explique para que serve a peça.
   - `images`: caminhos das fotos da galeria, por exemplo `['/assets/suporte-fone-detalhe.jpg']`.
4. Salve o arquivo. O cartão e a página do projeto usam o mesmo modelo automaticamente.
5. Para incluir o projeto nas buscas do Google, adicione a URL `https://alexdesign.art.br/projetos/SEU-SLUG` em `public/sitemap.xml`, substituindo `SEU-SLUG` pelo valor usado no campo `slug`.

Não repita o `slug` de outro projeto. Para manter as imagens da galeria, use caminhos iniciados por `/assets/`.
