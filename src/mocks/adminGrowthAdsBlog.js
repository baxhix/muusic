export const mockAdminSections = {
  lista_espera: {
    title: 'Lista de Espera',
    subtitle: 'Acompanhamento de leads cadastrados para lançamento.',
    kpis: [
      { label: 'Inscritos', value: 1248 },
      { label: 'Confirmações', value: 823 },
      { label: 'Taxa de conversão', value: '66%' }
    ],
    columns: ['Nome', 'E-mail', 'Origem', 'Status'],
    rows: [
      ['Ana Souza', 'ana@teste.com', 'Instagram', 'Confirmado'],
      ['Bruno Lima', 'bruno@teste.com', 'Orgânico', 'Pendente'],
      ['Carla Nunes', 'carla@teste.com', 'Indicação', 'Confirmado'],
      ['Diego Alves', 'diego@teste.com', 'Anúncio', 'Pendente']
    ]
  },
  landing_pages: {
    title: 'Landing Pages',
    subtitle: 'Desempenho de páginas de captura.',
    kpis: [
      { label: 'Páginas ativas', value: 6 },
      { label: 'Visitantes (7d)', value: 9340 },
      { label: 'Conversão média', value: '12.4%' }
    ],
    columns: ['Página', 'Visitantes', 'Conversões', 'Taxa'],
    rows: [
      ['/vip-show', '2.340', '354', '15.1%'],
      ['/waitlist', '3.780', '491', '13.0%'],
      ['/beta', '1.620', '121', '7.4%'],
      ['/newsletter', '1.600', '198', '12.3%']
    ]
  },
  campanhas: {
    title: 'Campanhas',
    subtitle: 'Campanhas de aquisição e retenção.',
    kpis: [
      { label: 'Campanhas ativas', value: 9 },
      { label: 'CPA médio', value: 'R$ 14,20' },
      { label: 'ROAS', value: '2.8x' }
    ],
    columns: ['Campanha', 'Canal', 'Investimento', 'Resultado'],
    rows: [
      ['Pré-lançamento', 'Meta', 'R$ 4.500', '1.120 leads'],
      ['Retargeting', 'Google', 'R$ 2.800', '642 leads'],
      ['Influencers', 'TikTok', 'R$ 3.200', '381 leads'],
      ['Reativação base', 'E-mail', 'R$ 600', '214 ativações']
    ]
  },
  publicidade_dashboard: {
    title: 'Publicidade Dashboard',
    subtitle: 'Visão geral da operação de mídia paga.',
    kpis: [
      { label: 'Receita (30d)', value: 'R$ 182k' },
      { label: 'Impressões', value: '4.2M' },
      { label: 'CTR médio', value: '1.9%' }
    ],
    columns: ['Canal', 'Impressões', 'Cliques', 'Receita'],
    rows: [
      ['Display', '2.1M', '31k', 'R$ 71k'],
      ['In-feed', '1.3M', '22k', 'R$ 63k'],
      ['Newsletter', '450k', '9k', 'R$ 28k'],
      ['Patrocínio', '350k', '4k', 'R$ 20k']
    ]
  },
  anuncios: {
    title: 'Anúncios',
    subtitle: 'Inventário de anúncios em execução.',
    kpis: [
      { label: 'Ativos', value: 32 },
      { label: 'Em revisão', value: 4 },
      { label: 'Pausados', value: 7 }
    ],
    columns: ['Anúncio', 'Cliente', 'Formato', 'Status'],
    rows: [
      ['Summer Push', 'Lumen Beats', 'Banner', 'Ativo'],
      ['Noite Eletrônica', 'Pulse FM', 'Vídeo', 'Ativo'],
      ['Festival 2026', 'Live Nation', 'Native', 'Revisão'],
      ['Combo Premium', 'Groove+', 'Banner', 'Pausado']
    ]
  },
  clientes: {
    title: 'Clientes',
    subtitle: 'Base de clientes da vertical de publicidade.',
    kpis: [
      { label: 'Clientes ativos', value: 58 },
      { label: 'Novos no mês', value: 6 },
      { label: 'Churn mensal', value: '2.1%' }
    ],
    columns: ['Cliente', 'Segmento', 'Plano', 'Saúde'],
    rows: [
      ['Lumen Beats', 'Gravadora', 'Pro', 'Saudável'],
      ['Pulse FM', 'Rádio', 'Enterprise', 'Atenção'],
      ['Wave Agency', 'Agência', 'Pro', 'Saudável'],
      ['Groove+', 'Streaming', 'Starter', 'Risco']
    ]
  },
  convites_publicidade: {
    title: 'Convites',
    subtitle: 'Convites enviados para novos anunciantes.',
    kpis: [
      { label: 'Enviados', value: 124 },
      { label: 'Aceitos', value: 47 },
      { label: 'Taxa de aceite', value: '37.9%' }
    ],
    columns: ['Empresa', 'Contato', 'Canal', 'Status'],
    rows: [
      ['SoundLab', 'julia@soundlab.com', 'E-mail', 'Aceito'],
      ['Nova Wave', 'contato@novawave.com', 'LinkedIn', 'Pendente'],
      ['Mira Ads', 'leo@miraads.com', 'E-mail', 'Aceito'],
      ['Beat Studio', 'time@beatstudio.com', 'WhatsApp', 'Pendente']
    ]
  },
  blog: {
    title: 'Blog',
    subtitle: 'Conteúdo editorial e calendário de publicações.',
    kpis: [
      { label: 'Posts publicados', value: 42 },
      { label: 'Rascunhos', value: 11 },
      { label: 'Leituras (30d)', value: '78k' }
    ],
    columns: ['Título', 'Autor', 'Categoria', 'Status'],
    rows: [
      ['Como planejar um show', 'Equipe Muusic', 'Eventos', 'Publicado'],
      ['Checklist de release', 'Marina Costa', 'Marketing', 'Rascunho'],
      ['Guia de trendings', 'Pedro Luz', 'Dados', 'Publicado'],
      ['Mídia para artistas', 'Ana Lima', 'Publicidade', 'Revisão']
    ]
  }
};
