# Muusic 2.0 - Mapbox + Spotify + Realtime Chat

Aplicação web com três pilares:
- Interface centrada no mapa (Mapbox).
- Identidade de usuário com fluxo de autenticação básico.
- Presença geográfica e interação social em tempo real.
- Painel administrativo por subdomínio (`painel.muusic.live`) para gestão de usuários.

## Stack
- Frontend: React + Vite + Mapbox GL JS
- Backend: Node.js + Express + Socket.IO
- Realtime: WebSocket-only

## Setup
1. Instale dependências:
   ```bash
   npm install
   ```
2. Configure variáveis:
   ```bash
   cp .env.example .env
   ```
3. Rode frontend + backend:
   ```bash
   npm run dev
   ```

## Banco de dados (PostgreSQL + Prisma)
- Com `DATABASE_URL` definido, o backend usa PostgreSQL.
- Sem `DATABASE_URL`, o backend continua usando JSON local como fallback.
- Para geolocalização, use PostGIS (`CREATE EXTENSION postgis`).

Comandos:
```bash
npm run prisma:generate
npm run db:push
npm run migrate:json-to-db
```

Endpoints de mapa:
- `GET /api/map/nearby?lat=-23.55&lng=-46.63&radius=10`
- `GET /api/map/bounds?north=-20&south=-26&east=-43&west=-49`

## Cache e Sessao (Redis opcional)
- Com `REDIS_URL` definido, cache e sessoes usam Redis.
- Sem `REDIS_URL`, o app continua funcional:
  - cache desativado automaticamente
  - sessao cai para PostgreSQL (se `DATABASE_URL`) ou memoria local

Infra local (Postgres + Redis):
```bash
docker compose -f docker-compose.dev.yml up -d
```

## Scripts
- `npm run dev`: sobe client e server em paralelo
- `npm run build`: build de produção
- `npm run preview`: preview local do build
- `npm run lint`: checagem estática
- `npm run format`: formatação com Prettier
- `npm run test`: suíte de testes (Vitest)

## Estado Atual (Sprint 3)
- Modularização inicial da lógica de simulação de mapa e utilitários.
- Carregamento lazy de dependências pesadas (`mapbox-gl` e `socket.io-client`).
- CSS modularizado em múltiplos arquivos por domínio.
- Hooks por domínio para escalar manutenção:
  - `useAuthFlow`
  - `useRealtimePresence`
  - `useMapEngine`
- Autenticacao local real:
  - JWT assinado + `sessionId` validado no backend
  - Sessao persistida (Redis/PostgreSQL/memoria fallback)
  - Recuperacao e redefinicao real de senha por token com expiracao
  - Logout com revogacao de sessao
- RBAC inicial (roles `ADMIN` e `USER`) com APIs administrativas:
  - `GET /admin/users`
  - `POST /admin/users`
  - `PATCH /admin/users/:id`
  - `DELETE /admin/users/:id`
- Frontend com modo admin automatico ao acessar host `painel.muusic.live`.
- Configuração de qualidade de código (ESLint + Prettier).
- Base de testes unitários com Vitest.
- Otimização de bundle via `manualChunks` no Vite.

## Próximos passos para produção
- Persistência real de chat/presença (DB + Redis adapter do Socket.IO).
- Observabilidade (logs estruturados, tracing e métricas).
- Hardening de segurança (rate-limit, validacao de payload e antifraude).
- Revisão de estratégia de caching e carregamento incremental.
