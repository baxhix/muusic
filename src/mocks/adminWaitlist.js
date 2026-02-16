export const WAITLIST_STATUS = {
  PENDENTE: 'pendente',
  CONVIDADO: 'convidado',
  CANCELADO: 'cancelado'
};

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: WAITLIST_STATUS.PENDENTE, label: 'Pendente' },
  { value: WAITLIST_STATUS.CONVIDADO, label: 'Convidado' },
  { value: WAITLIST_STATUS.CANCELADO, label: 'Cancelado' }
];

export const ORIGIN_OPTIONS = [
  { value: 'homepage', label: 'Homepage' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'evento', label: 'Evento' },
  { value: 'parceria', label: 'Parceria' }
];

export const waitlistRecords = [
  { id: 'w1', email: 'marcelo.demari@leanwork.com.br', origin: 'homepage', createdAt: '2026-02-13T09:56:00.000Z', status: 'pendente' },
  { id: 'w2', email: 'demari.lets@gmail.com', origin: 'homepage', createdAt: '2026-02-13T09:56:00.000Z', status: 'pendente' },
  { id: 'w3', email: 'jim3233@icloud.com', origin: 'homepage', createdAt: '2026-02-10T12:50:00.000Z', status: 'pendente' },
  { id: 'w4', email: 'seanpgleeson@gmail.com', origin: 'instagram', createdAt: '2026-02-08T14:16:00.000Z', status: 'pendente' },
  { id: 'w5', email: 'ryan.mente@gmail.com', origin: 'homepage', createdAt: '2026-02-08T13:00:00.000Z', status: 'pendente' },
  { id: 'w6', email: 'cfrederickson5@gmail.com', origin: 'homepage', createdAt: '2026-02-08T11:57:00.000Z', status: 'pendente' },
  { id: 'w7', email: 'alvesthomaz46@gmail.com', origin: 'parceria', createdAt: '2026-02-08T09:13:00.000Z', status: 'pendente' },
  { id: 'w8', email: 'caio.nogueira@outlook.com', origin: 'evento', createdAt: '2026-02-07T16:08:00.000Z', status: 'pendente' },
  { id: 'w9', email: 'ana.luiza@hotmail.com', origin: 'instagram', createdAt: '2026-02-06T22:40:00.000Z', status: 'pendente' },
  { id: 'w10', email: 'contato@estudiomob.com', origin: 'homepage', createdAt: '2026-02-06T12:20:00.000Z', status: 'pendente' },
  { id: 'w11', email: 'fernanda@livelabs.co', origin: 'parceria', createdAt: '2026-02-06T08:20:00.000Z', status: 'pendente' },
  { id: 'w12', email: 'rafael.matos@gmail.com', origin: 'homepage', createdAt: '2026-02-05T17:22:00.000Z', status: 'pendente' },
  { id: 'w13', email: 'sofia@brandroom.app', origin: 'evento', createdAt: '2026-02-05T12:50:00.000Z', status: 'pendente' },
  { id: 'w14', email: 'lucas.aguiar@terra.com', origin: 'instagram', createdAt: '2026-02-05T08:48:00.000Z', status: 'pendente' },
  { id: 'w15', email: 'gilberto.pires@uol.com.br', origin: 'homepage', createdAt: '2026-02-04T20:17:00.000Z', status: 'pendente' },
  { id: 'w16', email: 'debora.reis@gmail.com', origin: 'instagram', createdAt: '2026-02-03T19:05:00.000Z', status: 'convidado' },
  { id: 'w17', email: 'maria.oliveira@gmail.com', origin: 'homepage', createdAt: '2026-02-03T14:04:00.000Z', status: 'convidado' },
  { id: 'w18', email: 'samuel.borges@yahoo.com', origin: 'evento', createdAt: '2026-02-03T09:45:00.000Z', status: 'convidado' },
  { id: 'w19', email: 'maicon.sousa@gmail.com', origin: 'parceria', createdAt: '2026-02-02T21:32:00.000Z', status: 'cancelado' },
  { id: 'w20', email: 'victoria.assis@gmail.com', origin: 'instagram', createdAt: '2026-02-02T19:10:00.000Z', status: 'cancelado' }
];

export const DEFAULT_PAGE_SIZE = 7;

function normalizeStatus(user) {
  const raw = String(user?.status || '').toLowerCase();
  if (raw.includes('cancel')) return WAITLIST_STATUS.CANCELADO;
  if (raw.includes('invite') || raw.includes('convid')) return WAITLIST_STATUS.CONVIDADO;
  if (user?.inviteSentAt || user?.invitedAt) return WAITLIST_STATUS.CONVIDADO;
  return WAITLIST_STATUS.PENDENTE;
}

function inferOrigin(user) {
  const source = String(user?.source || user?.origin || '').toLowerCase();
  if (ORIGIN_OPTIONS.some((item) => item.value === source)) return source;
  return 'homepage';
}

export function mapUsersToWaitlistRecords(users = []) {
  return users
    .filter((user) => user?.email)
    .map((user, index) => ({
      id: String(user.id || `api-${index + 1}`),
      email: String(user.email).toLowerCase(),
      origin: inferOrigin(user),
      createdAt: user.createdAt || user.created_at || new Date().toISOString(),
      status: normalizeStatus(user)
    }));
}

export function calculateKpis(records) {
  return {
    total: records.length,
    pending: records.filter((item) => item.status === WAITLIST_STATUS.PENDENTE).length,
    invited: records.filter((item) => item.status === WAITLIST_STATUS.CONVIDADO).length
  };
}

export function queryWaitlist({ records, search = '', status = 'all', page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = records
    .filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (normalizedSearch && !item.email.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    totalPages
  };
}

export async function fetchWaitlistMock({ records = waitlistRecords, search, status, page, pageSize, shouldFail = false }) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (shouldFail) {
    throw new Error('Nao foi possivel carregar a lista de espera. Tente novamente.');
  }

  return {
    kpis: calculateKpis(records),
    ...queryWaitlist({ records, search, status, page, pageSize })
  };
}

export async function fetchWaitlistFromApi({ apiFetch, search, status, page, pageSize }) {
  const payload = await apiFetch('/admin/users?page=1&limit=500');
  const users = Array.isArray(payload?.users) ? payload.users : [];
  const records = mapUsersToWaitlistRecords(users);

  return {
    records,
    kpis: calculateKpis(records),
    ...queryWaitlist({ records, search, status, page, pageSize })
  };
}
