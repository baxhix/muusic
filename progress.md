Original prompt: Com o player do Spotify e o mapao FPS caiu pra 30

- Contexto inicial: regressao de FPS quando Spotify now playing ativo.
- Hipotese principal: reconexao frequente de socket por dependencia ampla em authUser no hook de presenca.
- Proximo passo: reduzir churn de estado/auth e estabilizar deps do socket.

- Alteracoes implementadas:
  - `useRealtimePresence`: removida dependencia de objeto `authUser` completo no efeito de socket; efeito agora depende de campos estaveis (`token`, `sessionId`, `id`, `name`, `spotify`) para evitar reconnect em toda mudanca de `nowPlaying`.
  - `useAuthFlow`: adicionado guard para nao chamar `setAuthUser`/`localStorage` quando o payload de `nowPlaying` nao muda (mesma faixa/metadados), reduzindo churn de render.

- Validacao:
  - `npm test` OK (3/3).
  - Skill Playwright executado em `http://127.0.0.1:5173` com screenshots em `output/web-game/shot-0.png` e `output/web-game/shot-1.png`.
  - Nao foi possivel validar gameplay/mapa no fluxo automatizado porque o app abriu em tela de login durante o smoke.

- TODOs para proximo ciclo:
  - Rodar benchmark de 60s logado no mapa (`Rodar benchmark (60s)`) com Spotify conectado e comparar `avg/min/1% low` antes/depois.
