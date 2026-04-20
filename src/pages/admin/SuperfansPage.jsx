import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarClock, Mail, MapPin, Minus, ShieldAlert, Trophy, Users2, X } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import PreviewPanel from '../../components/ui/PreviewPanel';
import StatusDot from '../../components/ui/StatusDot';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { mockUsers } from '../../mocks/adminUsers';

const PERIOD_TABS = [
  { value: 'all', label: 'Todo o período', multiplier: 1.24 },
  { value: '7d', label: 'Última semana', multiplier: 0.34 },
  { value: '15d', label: 'Últimos 15 dias', multiplier: 0.55 },
  { value: '30d', label: 'Último mês', multiplier: 0.78 }
];

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function MiniAvatar({ initials }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
      {initials}
    </span>
  );
}

function movementMeta(value) {
  if (value > 0) {
    return {
      label: `+${value}`,
      icon: ArrowUpRight,
      className: 'text-emerald-600 dark:text-emerald-400'
    };
  }

  if (value < 0) {
    return {
      label: String(value),
      icon: ArrowDownRight,
      className: 'text-rose-600 dark:text-rose-400'
    };
  }

  return {
    label: '0',
    icon: Minus,
    className: 'text-muted-foreground'
  };
}

export default function SuperfansPage() {
  const [period, setPeriod] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const activePeriod = PERIOD_TABS.find((tab) => tab.value === period) || PERIOD_TABS[0];

  const rows = useMemo(() => {
    return mockUsers
      .map((user, index) => {
        const score = Math.round((user.activityCount * 1.45 + user.playsCount * 0.62) * activePeriod.multiplier);
        const plays = Math.round(user.playsCount * activePeriod.multiplier);
        const movement = ((index * 7) % 9) - 4;

        return {
          ...user,
          score,
          plays,
          movement
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));
  }, [activePeriod]);

  const kpis = useMemo(() => {
    const online = rows.filter((user) => user.isOnline).length;
    const avgScore = rows.length ? Math.round(rows.reduce((sum, user) => sum + user.score, 0) / rows.length) : 0;
    const topCity = rows[0]?.cityState || '-';

    return {
      total: rows.length,
      online,
      avgScore,
      topCity
    };
  }, [rows]);

  const selectedUser = useMemo(() => rows.find((user) => user.id === selectedUserId) || null, [rows, selectedUserId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Superfãs" subtitle="Ranking dos usuários mais ativos na plataforma, com leitura rápida de posição, atividade e movimento." />

      <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <KpiCard label="Usuários no ranking" value={kpis.total} icon={Users2} size="compact" />
        <KpiCard label="Online agora" value={kpis.online} hint={`${Math.round((kpis.online / Math.max(kpis.total, 1)) * 100)}%`} icon={Users2} size="compact" />
        <KpiCard label="Score médio" value={kpis.avgScore} icon={Trophy} size="compact" />
        <KpiCard label="Cidade líder" value={kpis.topCity} icon={Trophy} size="compact" />
      </section>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Ranking de atividade</CardTitle>
            <p className="text-sm text-muted-foreground">Top 50 usuários com maior atividade combinada na plataforma.</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_TABS.map((tab) => {
              const active = tab.value === period;
              return (
                <Button
                  key={tab.value}
                  type="button"
                  variant={active ? 'secondary' : 'ghost'}
                  className={active ? 'border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-100' : ''}
                  onClick={() => setPeriod(tab.value)}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Movimento</TableHead>
                <TableHead>Cidade-estado</TableHead>
                <TableHead>Reproduções</TableHead>
                <TableHead>Atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => {
                const movement = movementMeta(user.movement);
                const MovementIcon = movement.icon;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="w-[72px] font-medium text-foreground">{user.rank}</TableCell>
                    <TableCell className="min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <MiniAvatar initials={user.avatarInitials} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="truncate text-left font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            {user.name}
                          </button>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <StatusDot variant={user.isOnline ? 'success' : 'neutral'} size="sm" />
                            @{user.email.split('@')[0]}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-[110px]">
                      <div className={`inline-flex items-center gap-1 text-sm font-medium ${movement.className}`}>
                        <MovementIcon className="h-4 w-4" />
                        <span>{movement.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.cityState}</TableCell>
                    <TableCell>{formatNumber(user.plays)}</TableCell>
                    <TableCell>{formatNumber(user.activityCount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)}>
          <aside
            className="ml-auto flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-border bg-background p-6 text-foreground shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <MiniAvatar initials={selectedUser.avatarInitials} />
                <div>
                  <div className="text-lg font-semibold text-foreground">{selectedUser.fullName}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.cityState}</div>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedUserId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <PreviewPanel
                title="Dados completos"
                description="Registro cadastral principal do superfã selecionado."
                className="bg-card text-card-foreground"
                contentClassName="space-y-4"
                footer={
                  <Button type="button" className="justify-start">
                    <ShieldAlert className="h-4 w-4" />
                    Banir / bloquear usuário
                  </Button>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-secondary/35 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contato</div>
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      <div className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 break-all leading-6">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="leading-6">{selectedUser.registeredData.cidadeEstado}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/35 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dados cadastrados</div>
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      <div className="leading-6">
                        Idade: <span className="font-medium text-foreground/85">{selectedUser.registeredData.idade} anos</span>
                      </div>
                      <div className="leading-6">
                        Sexo: <span className="font-medium text-foreground/85">{selectedUser.registeredData.sexo}</span>
                      </div>
                      <div className="leading-6">
                        Telefone: <span className="font-medium text-foreground/85 break-all">{selectedUser.registeredData.telefone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </PreviewPanel>

              <PreviewPanel title="Logs" description="Eventos principais para auditoria e análise rápida." className="bg-card text-card-foreground" contentClassName="space-y-3">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-secondary/35 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      Aceite dos termos
                    </div>
                    <div className="mt-2 text-sm text-foreground">{formatDateTime(selectedUser.acceptedTermsAt)}</div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/35 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Últimos streams</div>
                    <div className="mt-3 space-y-3">
                      {selectedUser.streams.map((stream) => (
                        <div key={stream.id} className="rounded-lg border border-border/80 bg-background p-3">
                          <div className="font-medium text-foreground">{stream.song}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{stream.displayDate}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PreviewPanel>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
