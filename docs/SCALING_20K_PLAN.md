# Plano Tecnico para 20k Usuarios Concurrentes

Data: 2026-02-19  
Objetivo: preparar o produto para 20k usuarios navegando com fluidez, escalando infraestrutura apenas no momento necessario.

## 1. Metas de Qualidade (SLO)

- Mapa: FPS p50 >= 45 em desktop e >= 30 em mobile.
- API publica: latencia p95 <= 250ms para endpoints de leitura.
- Realtime (Socket): latencia de entrega p95 <= 500ms.
- Erros: taxa de erro 5xx < 0.5%.
- UX: Time to Interactive (p95) <= 3.5s em 4G.

## 2. Fase 0 (Amanha - 2026-02-20): Hardening Basico + Evidencias

### 2.1 Entregaveis para revisao tecnica

- Documento de arquitetura atual + gargalos.
- Dashboard minimo de metricas (API, socket, mapa).
- Resultado de carga baseline (1k, 3k e 5k usuarios virtuais).
- Lista priorizada de correcoes P0 e P1.

### 2.2 Ajustes P0 (sem nova maquina)

1. Realtime
- Implementar rooms por area (geohash/celula) para broadcast segmentado.
- Enviar apenas eventos essenciais (diff), com payload reduzido.
- Aplicar rate limit por usuario/evento no servidor.

2. API
- Cache Redis para endpoints quentes de mapa e feed.
- Limitar consultas por bbox + paginação deterministica.
- Garantir indices no banco para filtros de viewport e ordenacao.

3. Frontend
- Reduzir atualizacao de UI em alta frequencia (throttle/debounce).
- Simplificar renderizacao quando zoom aberto (menos detalhes).
- Garantir culling virtual (nao desenhar fora da viewport).

4. Deploy/Operacao
- Healthcheck e smoke pos deploy.
- Script de deploy com `npm ci` limpo e retry (ja aplicado).
- Log estruturado com correlation id por requisicao.

## 3. Fase 1 (3-5 dias): Otimizacao de Performance

1. Mapa
- Migrar marcadores volumosos para camada vetorial com cluster (evitar DOM marker em massa).
- Fazer atualizacao em lote de fonte GeoJSON (janela de 250-500ms).
- Ajustar regras por zoom (densidade/heatmap em zoom baixo, detalhes em zoom alto).

2. Servidor Realtime
- Coalescer eventos (agrupar atualizacoes em intervalos curtos).
- TTL para presenca efemera no Redis.
- Backpressure para eventos atrasados.

3. Banco
- Revisar plano de execucao das queries mais quentes.
- Adicionar/ajustar indices compostos e geoespaciais.
- Proteger rotas quentes com limites de pagina e filtros obrigatorios.

## 4. Fase 2 (1-2 semanas): Escala Controlada

1. Antes de adicionar maquinas
- Rodar teste de carga progressivo: 5k -> 10k -> 15k.
- Confirmar SLOs com uma instancia.

2. Quando escalar infra
- Subir multiplas instancias de app stateless.
- Socket com Redis adapter para fan-out horizontal.
- Balanceador com sticky session apenas se necessario.

3. Teste final para go-live 20k
- Carga 20k com cenario realista (mapa + feed + auth).
- Teste de resiliencia (reinicio de instancia e degradacao parcial).

## 5. Backlog Priorizado

## P0 (imediato)
- Broadcast segmentado por area.
- Cache Redis em endpoints de leitura quentes.
- Reducao de payload realtime.
- Telemetria minima (p95 API/socket/FPS).

## P1 (curto prazo)
- Cluster vetorial completo no mapa.
- Batch update de presença.
- Queries com EXPLAIN e indices refinados.

## P2 (quando aproximar de 20k)
- Auto scale horizontal.
- Filas para tarefas nao criticas.
- Chaos testing e DR basico.

## 6. Criterio de "Pronto para 20k"

Considerar pronto quando:

- Teste sustentado de 20k por >= 30 min sem violar SLO.
- Erro 5xx < 0.5% e reconexao de socket estavel.
- UX sem travamento perceptivel em desktop/mobile.
- Plano de rollback validado.

## 7. Roteiro de Implementacao (pratico)

Dia 1:
- Observabilidade minima + baseline de carga.
- Rate limit socket + cache endpoints quentes.

Dia 2:
- Rooms por area + diff payload.
- Tuning de queries e indices.

Dia 3:
- Otimizacao do render do mapa por zoom.
- Novo teste de carga e comparativo.

Dia 4+:
- Escala horizontal controlada e teste de 20k.

