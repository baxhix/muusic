const now = Date.now();

export const mockModerationContent = [
  {
    id: 'mod-post-1',
    type: 'post',
    source: 'Buzz / Country Night BR',
    user: 'ana.souza',
    text: 'Esse show foi absurdo, alguém também gravou a entrada?',
    createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
    reports: 2
  },
  {
    id: 'mod-comment-1',
    type: 'comment',
    source: 'Buzz / Sertanejo Universitário',
    user: 'lucas.violao',
    text: 'Concordo com você, esse artista está no topo do mês.',
    createdAt: new Date(now - 1000 * 60 * 36).toISOString(),
    reports: 1
  },
  {
    id: 'mod-reply-1',
    type: 'reply',
    source: 'Buzz / Country Night BR',
    user: 'bianca.music',
    text: 'Partiu organizar caravana para o próximo show.',
    createdAt: new Date(now - 1000 * 60 * 80).toISOString(),
    reports: 0
  },
  {
    id: 'mod-post-2',
    type: 'post',
    source: 'Feed',
    user: 'joao.dj',
    text: 'Pré-show já começou por aqui. Quem chega cedo?',
    createdAt: new Date(now - 1000 * 60 * 140).toISOString(),
    reports: 3
  }
];

export const moderationTypeOptions = [
  { label: 'Todos os tipos', value: 'all' },
  { label: 'Posts', value: 'post' },
  { label: 'Comentários', value: 'comment' },
  { label: 'Respostas', value: 'reply' }
];
