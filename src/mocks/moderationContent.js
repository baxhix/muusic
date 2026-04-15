const now = Date.now();

export const moderationTypeOptions = [
  { label: 'Tudo', value: 'all' },
  { label: 'Posts', value: 'post' },
  { label: 'Comentários', value: 'comment' }
];

export const moderationPriorityOptions = [
  { label: 'Todas as prioridades', value: 'all' },
  { label: 'Críticas', value: 'critical' },
  { label: 'Atenção', value: 'warning' },
  { label: 'Sem alerta', value: 'normal' }
];

export const mockModerationContent = [
  {
    id: 'mod-100',
    type: 'post',
    source: 'Feed / Festival de Inverno',
    user: 'camila.torres',
    userName: 'Camila Torres',
    cityState: 'Belo Horizonte-MG',
    text: 'Esse ingresso é um golpe total, essa banda é lixo e quem for nesse evento merece se ferrar.',
    createdAt: new Date(now - 1000 * 60 * 14).toISOString(),
    reports: 12,
    priority: 'critical',
    status: 'reported',
    suspiciousTerms: ['golpe', 'lixo', 'se ferrar'],
    reportReasons: ['Ofensa', 'Discurso agressivo', 'Possível fraude'],
    contentLabel: 'Post no feed'
  },
  {
    id: 'mod-101',
    type: 'comment',
    source: 'Comentários / Lançamento exclusivo',
    user: 'bruno.oliveira',
    userName: 'Bruno Oliveira',
    cityState: 'São Paulo-SP',
    text: 'Esse link da promoção está estranho. Parece scam, cuidado antes de clicar.',
    createdAt: new Date(now - 1000 * 60 * 22).toISOString(),
    reports: 4,
    priority: 'warning',
    status: 'reported',
    suspiciousTerms: ['scam', 'link estranho'],
    reportReasons: ['Spam', 'Link suspeito'],
    contentLabel: 'Comentário'
  },
  {
    id: 'mod-102',
    type: 'post',
    source: 'Buzz / Comunidade Ana',
    user: 'nina.ana',
    userName: 'Nina Fernandes',
    cityState: 'Curitiba-PR',
    text: 'Quem tiver cupom me chama no privado. Não sei se vale confiar nesse vendedor, mas tô tentando.',
    createdAt: new Date(now - 1000 * 60 * 49).toISOString(),
    reports: 0,
    priority: 'warning',
    status: 'suspect',
    suspiciousTerms: ['privado', 'confiar nesse vendedor'],
    reportReasons: [],
    contentLabel: 'Post na comunidade'
  },
  {
    id: 'mod-103',
    type: 'comment',
    source: 'Comentários / Show de lançamento',
    user: 'leo.santos',
    userName: 'Leonardo Santos',
    cityState: 'Recife-PE',
    text: 'A apresentação foi boa, mas o áudio do começo estava muito baixo.',
    createdAt: new Date(now - 1000 * 60 * 66).toISOString(),
    reports: 0,
    priority: 'normal',
    status: 'clean',
    suspiciousTerms: [],
    reportReasons: [],
    contentLabel: 'Comentário'
  },
  {
    id: 'mod-104',
    type: 'post',
    source: 'Feed / Encontro de fãs',
    user: 'maria.lima',
    userName: 'Maria Eduarda Lima',
    cityState: 'Salvador-BA',
    text: 'Tenho o telefone da produção aqui. Se quiserem eu passo no inbox para pressionar eles.',
    createdAt: new Date(now - 1000 * 60 * 92).toISOString(),
    reports: 6,
    priority: 'critical',
    status: 'reported',
    suspiciousTerms: ['telefone da produção', 'pressionar'],
    reportReasons: ['Exposição de dados', 'Assédio'],
    contentLabel: 'Post no feed'
  },
  {
    id: 'mod-105',
    type: 'comment',
    source: 'Comentários / TikTok oficial',
    user: 'bia.rocha',
    userName: 'Beatriz Rocha',
    cityState: 'Rio de Janeiro-RJ',
    text: 'Quero muito ver essa versão acústica completa no app.',
    createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
    reports: 1,
    priority: 'normal',
    status: 'reported',
    suspiciousTerms: [],
    reportReasons: ['Denúncia avulsa'],
    contentLabel: 'Comentário'
  }
];
