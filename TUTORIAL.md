# Mesa Tática — tutorial de publicação no GitHub Pages

Este projeto é um mini-VTT (mesa virtual) feito só com HTML, CSS e JavaScript. Não precisa de servidor, banco de dados nem instalação: o GitHub hospeda tudo de graça.

## 1. O que vem no pacote

```
vtt-rpg/
├── index.html            ← a página
├── style.css             ← o visual
├── script.js             ← toda a lógica
├── TUTORIAL.md           ← este guia
├── data/
│   └── biblioteca.json   ← lista de mapas, personagens e objetos prontos (você edita)
├── audio/                ← áudios da Expansão de Domínio (.mp3, .ogg, .wav)
└── img/
    ├── mapas/            ← coloque aqui as imagens dos mapas
    ├── objetos/          ← imagens de objetos (caixa, carro, pedra…)
    └── personagens/      ← coloque aqui as fotos dos personagens
```

Os arquivos de exemplo (`exemplo-rua.svg`, `exemplo-normal.svg` etc.) servem para testar. Pode apagar depois.

## 2. O que o programa faz

- **Mapa:** grade quadriculada configurável (tamanho da casa, deslocamento, cor, opacidade) com ou sem imagem de fundo. Zoom com a roda do mouse (ou pinça no celular) e movimentação arrastando o fundo.
- **Tokens:** arrastar e soltar, com encaixe opcional na grade. Botão **＋ Token** para criar e **⇆ Organizar** para reunir todos numa fileira se algum se perder.
- **Ficha do personagem (clique no token):** galeria de 3 fotos (Normal, Transformação/Ação, Caído/Morto), nome, estado (Bem / Machucado / Morto), PV, EA, tamanho e anotações. O estado muda a borda e o ícone do token no mapa, e quando o estado é **Morto** o token passa a mostrar a foto 3 em preto e branco.
- **Salvamento automático** no `localStorage` do navegador: posições, imagens, estados, mapa e zoom.

Extras que adicionei além do que você pediu:

- **Régua** (tecla `R`): arraste no mapa e veja a distância em casas e em metros (configure "metros por casa").
- **Rolador de dados** com fórmulas como `1d20`, `3d10+9` e `4d20kh1+9` (`kh` mantém o maior, `kl` o menor).
- **PV e EA** com barrinhas no token.
- **Biblioteca** (`data/biblioteca.json`): escolha mapas e personagens prontos num menu.
- **Exportar / importar cena** e **publicar a cena do mestre** (explicado no passo 7).
- **Ocultar dados de NPCs e vilões:** cada token tem um **Tipo** (Jogador ou NPC / vilão). Com o botão **🔒 NPCs ocultos** ligado (padrão), tokens de NPC mostram só nome e estado: somem as barras de PV/EA no mapa e, na ficha, os campos de PV, EA e anotações ficam escondidos. Para editar, clique em **👁 Mostrar (mestre)**; os dados voltam a ser ocultados ao fechar a ficha. Jogadores nunca são ocultados. Personagens da biblioteca já entram com o tipo certo (grupo "Jogadores" = jogador, o resto = NPC), e você pode trocar o tipo na ficha. Desligue o botão da barra para mostrar tudo.
- **Domínios** (menu **🗺 Mapa → 🌀 Domínios**, veja a seção abaixo): botão **EXPD** com cena em tela cheia, áudio e círculo escuro, e botão **Domínio Simples**.
- **Objetos** (menu **🗺 Mapa → 🧱 Objetos**): caixas, carros, paredes, pedras e o que mais você quiser, com tamanho, rotação e cor.
- Atalhos: `G` grade, `R` régua, `+`/`-` zoom, `0` ajustar à tela, `Esc` fechar, `Delete` remover o token selecionado.

### Domínios: Expansão de Domínio e Domínio Simples

Tudo fica no botão **🗺 Mapa**, na seção **🌀 Domínios** (as seções do menu abrem uma de cada vez).

**Expansão de Domínio (botão EXPD).** Ao clicar, a tela inteira escurece, aparece **EXPANSÃO DE DOMÍNIO** em roxo (com o nome do domínio embaixo, se você preencheu) e o áudio toca. Quando a cena termina, nasce no mapa um **círculo escuro** com o raio que você definiu. Clique em qualquer lugar da cena (ou aperte `Esc`) para pular. Configurações:

- **Centro do domínio:** "Centro da tela" ou o nome de um token (a expansão nasce na posição dele).
- **Raio da Expansão (casas):** o menu mostra a conversão em metros usando "Metros por casa". Cada círculo ativo também aparece na lista, onde dá para ajustar o raio na hora ou encerrar (✕).
- **Nome do domínio:** opcional, aparece sob o título e na etiqueta do círculo. Troque antes de cada uso se quiser.
- **Áudio:** caminho de um arquivo no repositório (ex.: `audio/meu-dominio.mp3`) ou link direto para um arquivo `.mp3`, `.ogg` ou `.wav`. Links de YouTube ou de páginas do Google Drive não funcionam. Use **🔊 Testar áudio** para ouvir antes. O arquivo `audio/exemplo-dominio.wav` é só um som de teste; troque pelo seu.
- **Volume, duração da cena e escuridão do círculo**, e a opção **Só o círculo, sem a cena** para colocar um círculo sem a cinemática.
- Círculos sem token têm um **✥** na etiqueta do alto: arraste por ali para mover.

**Domínio Simples.** Cria um anel azul tracejado, sem cena e sem áudio, com o raio definido em **Raio do Domínio Simples**. Se você escolher um token em "Centro do domínio", o anel **segue o token** quando ele é movido.

**Importante para jogar por compartilhamento de tela:** o som só chega aos jogadores se você compartilhar a **aba do navegador** com a opção de compartilhar o áudio da aba marcada (Discord, Meet e Zoom mostram isso ao escolher o que compartilhar). Compartilhando a janela ou a tela inteira, eles veem a cena, mas não ouvem o áudio.

Áudios de animes e jogos são protegidos por direitos autorais. Em repositório público, qualquer pessoa pode baixá-los; para uso só entre amigos, o mais seguro é usar sons que você tem direito de usar.

### Objetos

Seção **🧱 Objetos** do menu **🗺 Mapa**. Os objetos ficam **abaixo dos tokens** e acima do mapa.

- **Da biblioteca:** escolha um objeto pronto (caixa, barril, pedra, pilar, mesa, carro).
- **▭ Retângulo e ◯ Círculo:** formas coloridas, ótimas para paredes, barreiras e áreas.
- **Enviar imagem…** ou **caminho** (ex.: `img/objetos/caixa.png`): qualquer imagem vira objeto. PNG e WebP com fundo transparente ficam melhores. Imagens enviadas do computador ocupam o armazenamento do navegador, como os mapas.
- **Arrastar** move o objeto (encaixa na grade se a opção estiver ligada). **Clicar** abre o painel de edição: nome, largura e altura em casas (aceita 0,25), rotação (controle deslizante, ±15° e 90°), cor, opacidade, travar, frente/trás, duplicar e remover. Também dá para remover com `Delete`.
- **Travar** deixa o objeto fixo e sem cliques no mapa (bom para chão e paredes). Objetos travados continuam na lista do menu, de onde você abre o painel para destravar.
- Para adicionar à biblioteca, edite `data/biblioteca.json` e acrescente em `"objetos"`: `{ "nome": "Poste", "src": "img/objetos/poste.png", "largura": 1, "altura": 3 }`.

## 3. Criar o repositório no GitHub

1. Entre em <https://github.com> e faça login (ou crie uma conta gratuita).
2. Clique no **+** no canto superior direito e em **New repository**.
3. Em **Repository name**, escolha um nome sem espaços nem acentos, por exemplo `mesa-tatica`.
4. Marque **Public**. O GitHub Pages gratuito só funciona com repositório público.
5. Clique em **Create repository**.

Atenção: repositório público significa que qualquer pessoa com o link pode ver as imagens que você subir. Use apenas imagens que você pode divulgar.

## 4. Subir os arquivos

### Opção A: pelo navegador (mais fácil)

1. Descompacte o `vtt-rpg.zip` no seu computador.
2. No repositório recém-criado, clique em **uploading an existing file** (ou em **Add file → Upload files**).
3. Abra a pasta descompactada e arraste **todo o conteúdo** para a página: `index.html`, `style.css`, `script.js`, `TUTORIAL.md` e as pastas `data` e `img`. No Chrome e no Edge, arrastar as pastas mantém a estrutura.
4. Role até o final e clique em **Commit changes**.

Confira depois se os arquivos ficaram assim na raiz do repositório: `index.html` precisa estar na raiz, não dentro de uma subpasta.

### Opção B: pelo Git (linha de comando)

```bash
cd vtt-rpg
git init
git add .
git commit -m "Mesa tática"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/mesa-tatica.git
git push -u origin main
```

## 5. Onde colocar as imagens

| O que | Pasta | Exemplo de caminho |
|---|---|---|
| Mapas | `img/mapas/` | `img/mapas/coliseu.png` |
| Fotos de personagens | `img/personagens/` | `img/personagens/kenshin-normal.png` |
| Objetos | `img/objetos/` | `img/objetos/caixa.png` |
| Áudios de domínio | `audio/` | `audio/meu-dominio.mp3` |

Regras importantes:

- **Nomes em minúsculas, sem espaços e sem acentos** (use `kenshin-acao.png`, não `Kenshin Ação.PNG`). O GitHub diferencia maiúsculas de minúsculas.
- Prefira `.jpg` ou `.webp` para mapas e `.png` ou `.webp` para tokens. Mantenha os mapas abaixo de uns 2 MB para carregar rápido no celular dos jogadores.
- Para subir mais imagens depois: abra a pasta no GitHub, **Add file → Upload files**, arraste e faça **Commit changes**.

### Registrando na biblioteca

Abra `data/biblioteca.json` no GitHub (ícone do lápis para editar) e adicione entradas. Exemplo:

```json
{
  "mapas": [
    { "nome": "Coliseu - arena", "src": "img/mapas/coliseu-arena.jpg", "cell": 70, "metrosPorQuadrado": 1.5 }
  ],
  "personagens": [
    {
      "nome": "Kenshin Zenin",
      "fotos": [
        "img/personagens/kenshin-normal.png",
        "img/personagens/kenshin-acao.png",
        "img/personagens/kenshin-caido.png"
      ],
      "pvMax": 54,
      "eaMax": 64,
      "tamanho": 1
    }
  ]
}
```

Campos opcionais: `grupo` (agrupa o personagem no menu da biblioteca), `notas` (texto que já vem preenchido nas anotações) e `tamanho` (1 a 4 casas). Se uma foto listada não existir, ela é ignorada, e a mesa também tenta as extensões `.png`, `.jpg`, `.jpeg` e `.webp` sozinha. A lista completa de nomes de arquivo esperados para cada personagem está em `img/personagens/NOMES-DOS-ARQUIVOS.txt`.

Cuidado com as vírgulas: o JSON não aceita vírgula depois do último item de uma lista. Se o menu de biblioteca ficar vazio, o JSON provavelmente tem um erro de vírgula ou aspas (você pode conferir em <https://jsonlint.com>).

Sem mexer no JSON, também dá para colar o caminho da imagem direto no painel **🗺 Mapa** (para o mapa) ou na ficha do token (para as fotos).

### Ajustando a grade a um mapa

Mapas gerados por IA raramente têm casas exatas. No painel **🗺 Mapa**, mude **Tamanho da casa** e **Deslocar grade X/Y** até as linhas combinarem com o desenho, ou simplesmente desligue a grade e use a imagem como cenário. Os tokens acompanham a grade, então ajuste ela primeiro e só depois posicione os personagens.

## 6. Ativar o GitHub Pages

1. No repositório, clique em **Settings** (Configurações).
2. No menu da esquerda, clique em **Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, escolha `main` e a pasta `/ (root)`, depois clique em **Save**.
5. Espere de 1 a 3 minutos e atualize a página de Settings → Pages. Vai aparecer: *"Your site is live at https://SEU-USUARIO.github.io/mesa-tatica/"*.
6. Esse é o link para mandar aos jogadores.

Se aparecer erro 404, espere mais um pouco e confirme que `index.html` está na raiz do repositório.

## 7. Como jogar com os amigos (leia com atenção)

O programa salva tudo **no navegador de cada pessoa**. Isso significa que, quando você move um token, **o token não se move automaticamente na tela dos jogadores**. Não existe sincronização em tempo real, porque isso exigiria um servidor. Há três jeitos de lidar com isso:

1. **Compartilhar a tela (o mais simples).** Abra a mesa, entre numa chamada (Discord, Meet, Zoom) e compartilhe a aba. Você move os tokens e todos veem.
2. **Cena publicada pelo mestre.** Para entregar uma cena pronta:
   1. No painel **💾 Cena**, clique em **Exportar cena**.
   2. Renomeie o arquivo baixado para `cena.json`.
   3. No GitHub, abra a pasta `data`, **Add file → Upload files**, envie o `cena.json` e faça **Commit changes**.
   4. Os jogadores abrem o link e clicam em **🌐 Carregar a cena do mestre**. Na primeira visita, a cena carrega sozinha.
   
   Se a página mostrar a cena antiga, aperte `Ctrl + F5`, porque o GitHub Pages guarda cache por alguns minutos. Cada atualização é manual: sempre que mudar a cena, exporte e suba de novo.
3. **Sincronização de verdade (próximo passo opcional).** Dá para evoluir este projeto para tempo real usando um serviço gratuito como Firebase, Supabase ou PeerJS. Isso exige um pouco mais de código; se quiser, peça que eu monte essa versão.

Atenção: ocultar dados é só visual. Se você publicar a cena em `data/cena.json` (opção 2 acima), quem abrir o arquivo no navegador consegue ler o PV dos NPCs. Para jogar só com compartilhamento de tela, isso não é problema.

Observação: mapas e fotos que você **enviar pelo botão "Enviar arquivo…"** ficam só no seu navegador (e ocupam o limite de cerca de 5 MB do localStorage). Para os jogadores verem as imagens, coloque os arquivos nas pastas `img/` do repositório e use o caminho.

## 8. Testar no seu computador antes de publicar

Abrir o `index.html` com duplo clique funciona para o mapa e os tokens, mas a biblioteca e a cena publicada não carregam (o navegador bloqueia `fetch` em arquivos locais). Para testar tudo, abra um terminal na pasta e rode:

```bash
python3 -m http.server 8000
```

e acesse <http://localhost:8000>.

## 9. Problemas comuns

- **Imagem não aparece:** confira maiúsculas/minúsculas, espaços e a extensão no caminho. Abra o link da imagem direto (`https://SEU-USUARIO.github.io/mesa-tatica/img/mapas/arquivo.png`) para ver se ela existe.
- **Perdi meus tokens:** limpar os dados do navegador apaga o `localStorage`. Exporte a cena de vez em quando como backup.
- **Aviso de armazenamento cheio:** use imagens do repositório em vez de enviar arquivos pelo navegador.
- **Página em branco ou botões sem resposta:** aperte `F12`, abra a aba Console e veja a mensagem de erro; geralmente é um dos três arquivos que não subiu para o repositório.
