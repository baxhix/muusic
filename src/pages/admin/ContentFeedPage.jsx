import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Eye, Heart, Images, Mic2, Pencil, Plus, Search, Trash2, Upload, Users, Video } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PreviewPanel from '../../components/ui/PreviewPanel';
import StatusDot from '../../components/ui/StatusDot';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { mockAdminFeedItems } from '../../mocks/adminContentFeed';
import '../../styles/admin-content-feed.css';

const STORAGE_KEY = 'muusic.admin.content.feed';

const CONTENT_TYPES = [
  {
    value: 'simple_image',
    label: 'Imagem simples / carrossel',
    icon: Images,
    mediaHint: 'Links das imagens do post'
  },
  {
    value: 'photo_album',
    label: 'Álbum de fotos',
    icon: Images,
    mediaHint: 'Links das fotos do álbum'
  },
  {
    value: 'ana_stories',
    label: 'Stories da Ana',
    icon: Video,
    mediaHint: 'Links dos stories'
  },
  {
    value: 'ana_audio',
    label: 'Áudio da Ana',
    icon: Mic2,
    mediaHint: 'Link do arquivo de áudio'
  },
  {
    value: 'poll',
    label: 'Enquete, com ou sem imagem',
    icon: Eye,
    mediaHint: 'Imagem opcional da enquete'
  },
  {
    value: 'tiktok_video',
    label: 'Video TikTok',
    icon: Video,
    mediaHint: 'Link do vídeo'
  }
];

const STATUS_META = {
  published: {
    dot: 'success'
  },
  scheduled: {
    dot: 'warning'
  },
  inactive: {
    dot: 'neutral'
  }
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatCompact(value) {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getContentTypeMeta(contentType) {
  return CONTENT_TYPES.find((item) => item.value === contentType) || CONTENT_TYPES[0];
}

function getEngagementMeta(item) {
  const likes = Number(item.likes || 0);
  const reach = Number(item.reach || 0);

  if (reach >= 100000 || likes >= 15000) {
    return { label: 'Bombando', variant: 'success' };
  }

  if (reach >= 50000 || likes >= 7000) {
    return { label: 'Alto', variant: 'info' };
  }

  if (reach >= 20000 || likes >= 2000) {
    return { label: 'Médio', variant: 'accent' };
  }

  return { label: 'Baixo', variant: 'neutral' };
}

function EmptyPreview({ type }) {
  return (
    <div className="grid h-[340px] place-items-center rounded-[12px] border border-dashed border-border bg-background/40 text-sm text-muted-foreground">
      {type === 'video' ? 'Vídeo indisponível para preview.' : 'Imagem indisponível para preview.'}
    </div>
  );
}

function PreviewModal({ item, onClose }) {
  if (!item) return null;

  const typeMeta = getContentTypeMeta(item.contentType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <button type="button" className="admin-content-feed-overlay absolute inset-0" onClick={onClose} aria-label="Fechar preview" />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Preview do conteúdo</p>
            <div className="mt-1 flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <span className="admin-content-feed-type-pill inline-flex items-center px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]">
                {item.type === 'video' ? 'Vídeo' : 'Imagem'}
              </span>
              <Badge variant="neutral">{typeMeta.label}</Badge>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="p-6">
          {item.type === 'video' ? (
            item.mediaUrl ? (
              <video
                key={item.mediaUrl}
                src={item.mediaUrl}
                poster={item.thumbnail}
                controls
                autoPlay
                playsInline
                className="max-h-[70vh] w-full rounded-[12px] bg-background object-contain"
                style={{ accentColor: '#94a3b8' }}
              />
            ) : (
              <EmptyPreview type="video" />
            )
          ) : item.mediaUrl ? (
            <img src={item.mediaUrl} alt={item.title} className="max-h-[70vh] w-full rounded-[12px] bg-background object-contain" />
          ) : (
            <EmptyPreview type="image" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusSwitch({ checked, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className={`admin-content-feed-switch peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full shadow-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        checked ? 'is-checked' : ''
      }`}
    >
      <span
        className={`admin-content-feed-switch-thumb pointer-events-none inline-block h-5 w-5 rounded-full bg-white ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-[20px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function makeInitialDraft() {
  return {
    id: '',
    title: '',
    description: '',
    creatorName: '',
    contentType: 'simple_image',
    type: 'image',
    thumbnail: '',
    mediaUrl: '',
    mediaGallery: '',
    audioUrl: '',
    question: '',
    pollOptions: ['Opção 1', 'Opção 2', '', ''],
    status: 'scheduled',
    publishedAt: '',
    likes: 0,
    reach: 0
  };
}

function ContentTypeSelector({ value, onSelect }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {CONTENT_TYPES.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`admin-content-type-option ${selected ? 'is-selected' : ''}`}
          >
            <div className="flex items-start gap-4 text-left">
              <div className={`admin-content-type-icon ${selected ? 'is-selected' : ''}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EditorField({ label, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MockUploadField({ label, helper, multiple = false }) {
  return (
    <EditorField label={label}>
      <button type="button" className="admin-content-upload-field">
        <span className="admin-content-upload-icon">
          <Upload className="h-4 w-4" />
        </span>
      <span className="text-left">
          <span className="block text-sm font-medium text-foreground">{multiple ? 'Selecionar arquivos' : 'Selecionar arquivo'}</span>
          {helper ? <span className="mt-1 block text-sm text-muted-foreground">{helper}</span> : null}
        </span>
      </button>
    </EditorField>
  );
}

function PollOptionsFields({ values, onChange }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((index) => (
        <EditorField key={index} label={`Opção ${index + 1}`}>
          <input
            className="admin-content-editor-input"
            value={values[index] || ''}
            onChange={(event) => {
              const nextValues = [...values];
              nextValues[index] = event.target.value;
              onChange(nextValues);
            }}
            placeholder={`Digite a opção ${index + 1}`}
          />
        </EditorField>
      ))}
    </div>
  );
}

function ContentEditorPage({ draft, onChange, onBack, onSubmit }) {
  const typeMeta = getContentTypeMeta(draft.contentType);
  const isPoll = draft.contentType === 'poll';
  const isAudio = draft.contentType === 'ana_audio';
  const isMultiMedia =
    draft.contentType === 'simple_image' || draft.contentType === 'photo_album' || draft.contentType === 'ana_stories';
  const previewMedia =
    draft.mediaUrl ||
    draft.audioUrl ||
    draft.mediaGallery.split('\n').map((item) => item.trim()).find(Boolean) ||
    '';
  const previewKind =
    draft.contentType === 'ana_stories' || draft.contentType === 'tiktok_video' ? 'Vídeo' : draft.contentType === 'ana_audio' ? 'Áudio' : 'Imagem';
  const pollOptions = draft.pollOptions.map((item) => item.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title={draft.id ? 'Editar conteúdo' : 'Novo conteúdo'}
        actions={
          <Button variant="outline" onClick={onBack}>
            Voltar para o feed
          </Button>
        }
      />

      <div className="admin-content-breadcrumb">
        <span>V1</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Feed</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{draft.id ? 'Editar conteúdo' : 'Novo conteúdo'}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="bg-card text-card-foreground">
          <CardContent className="space-y-8 pt-6">
            <section className="space-y-4">
              <ContentTypeSelector value={draft.contentType} onSelect={(nextType) => onChange('contentType', nextType)} />
            </section>

            <section className="admin-content-editor-section">
              <div className="admin-content-editor-section-head">
                <h3 className="text-lg font-semibold text-foreground">Informações básicas</h3>
              </div>

              <div className="grid gap-4">
                <EditorField label="Título">
                  <input
                    className="admin-content-editor-input"
                    value={draft.title}
                    onChange={(event) => onChange('title', event.target.value)}
                    placeholder="Ex: Highlights do fim de semana"
                  />
                </EditorField>

                <EditorField label="Descrição">
                  <textarea
                    className="admin-content-editor-input admin-content-editor-textarea admin-content-editor-textarea-compact"
                    value={draft.description}
                    onChange={(event) => onChange('description', event.target.value)}
                    placeholder="Descreva o contexto e a mensagem principal da publicação."
                  />
                </EditorField>
              </div>
            </section>

            <section className="admin-content-editor-section">
              <div className="admin-content-editor-section-head">
                <div>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{typeMeta.label}</h3>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {isMultiMedia ? (
                  <MockUploadField label={draft.contentType === 'photo_album' ? 'Uploads de imagens' : 'Uploads de mídia'} helper="Mockup de upload múltiplo." multiple />
                ) : null}

                {!isAudio && !isPoll && draft.contentType !== 'simple_image' && draft.contentType !== 'photo_album' && draft.contentType !== 'ana_stories' ? (
                  <EditorField label={typeMeta.mediaHint}>
                    <input
                      className="admin-content-editor-input"
                      value={draft.mediaUrl}
                      onChange={(event) => onChange('mediaUrl', event.target.value)}
                      placeholder="https://..."
                    />
                  </EditorField>
                ) : null}

                {draft.contentType === 'simple_image' ? (
                  <MockUploadField label="Upload da imagem ou do carrossel" helper="Mockup de upload." multiple />
                ) : null}

                {isAudio ? (
                  <MockUploadField label="Upload do áudio" helper="Mockup de upload de áudio." />
                ) : null}

                {isPoll ? (
                  <>
                    <EditorField label="Pergunta da enquete">
                      <input
                        className="admin-content-editor-input"
                        value={draft.question}
                        onChange={(event) => onChange('question', event.target.value)}
                        placeholder="Qual lançamento deve abrir a semana?"
                      />
                    </EditorField>

                    <div className="md:col-span-2">
                      <PollOptionsFields values={draft.pollOptions} onChange={(nextValues) => onChange('pollOptions', nextValues)} />
                    </div>

                    <div className="md:col-span-2">
                      <MockUploadField label="Imagem opcional da enquete" helper="Mockup de upload." />
                    </div>
                  </>
                ) : null}

                {draft.contentType === 'tiktok_video' ? (
                  <EditorField label="URL do vídeo TikTok">
                    <input
                      className="admin-content-editor-input"
                      value={draft.mediaUrl}
                      onChange={(event) => onChange('mediaUrl', event.target.value)}
                      placeholder="https://..."
                    />
                  </EditorField>
                ) : null}
              </div>
            </section>
          </CardContent>
        </Card>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <PreviewPanel
            eyebrow="Resumo da publicação"
            title={draft.title || 'Novo conteúdo'}
            description={typeMeta.label}
            className="bg-card text-card-foreground"
            contentClassName="space-y-5 pt-0"
            footer={
              <div className="space-y-3">
                <Button type="button" variant="outline" className="w-full" onClick={() => onSubmit('inactive')}>
                  Salvar como rascunho
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => onSubmit('scheduled')}>
                  Agendar
                </Button>
                <Button type="button" className="w-full" onClick={() => onSubmit('published')}>
                  Publicar agora
                </Button>
              </div>
            }
          >
              <div className="overflow-hidden rounded-[12px] border border-border bg-secondary/30">
                {isPoll ? (
                  <div className="admin-content-preview-poll">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Enquete</p>
                        <h4 className="mt-2 text-base font-semibold text-foreground">{draft.question || 'Pergunta da enquete'}</h4>
                      </div>

                      <div className="space-y-2">
                        {pollOptions.length ? (
                          pollOptions.map((option, index) => (
                            <div key={`${option}-${index}`} className="admin-content-preview-poll-option">
                              <span>{option}</span>
                            </div>
                          ))
                        ) : (
                          <div className="admin-content-preview-poll-empty">Adicione as opções da enquete.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isAudio ? (
                  <div className="admin-content-preview-audio">
                    <div className="admin-content-preview-audio-art">
                      {draft.thumbnail ? <img src={draft.thumbnail} alt={draft.title || 'Capa do áudio'} className="h-full w-full object-cover" /> : <Mic2 className="h-8 w-8 text-slate-300" />}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Áudio da Ana</p>
                        <h4 className="mt-2 text-base font-semibold text-foreground">{draft.title || 'Novo áudio'}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{draft.description || 'Adicione uma descrição para contextualizar o áudio.'}</p>
                      </div>
                      <div className="admin-content-preview-audio-bar">
                        <span className="admin-content-preview-audio-progress" />
                      </div>
                    </div>
                  </div>
                ) : previewMedia ? (
                  <div className="relative aspect-[4/3]">
                    <img src={previewMedia} alt={draft.title || 'Preview'} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-background/95 via-background/50 to-transparent px-4 pb-3 pt-8">
                      <Badge variant="neutral">{previewKind}</Badge>
                      <Badge variant="outline">{typeMeta.label}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="grid aspect-[4/3] place-items-center text-sm text-muted-foreground">Preview do conteúdo</div>
                )}
              </div>
          </PreviewPanel>
        </aside>
      </div>
    </div>
  );
}

function normalizeDraftForSave(draft, nextStatus) {
  const mediaUrl =
    draft.contentType === 'ana_audio'
      ? draft.audioUrl
      : draft.contentType === 'poll'
        ? draft.mediaUrl
        : draft.contentType === 'simple_image'
          ? draft.mediaUrl
          : draft.mediaUrl || '';

  const contentType = draft.contentType;
  const isVideoType = contentType === 'ana_stories' || contentType === 'tiktok_video';

  return {
    ...draft,
    id: draft.id || `feed-${Date.now()}`,
    status: nextStatus,
    type: isVideoType ? 'video' : 'image',
    mediaUrl: mediaUrl || '',
    publishedAt: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : new Date().toISOString(),
    likes: Number(draft.likes || 0),
    reach: Number(draft.reach || 0)
  };
}

export default function ContentFeedPage() {
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      const baseItems = Array.isArray(stored) && stored.length ? stored : mockAdminFeedItems;
      return baseItems.filter((item) => item.id !== 'feed-001');
    } catch {
      return mockAdminFeedItems.filter((item) => item.id !== 'feed-001');
    }
  });
  const [previewItem, setPreviewItem] = useState(null);
  const [editorDraft, setEditorDraft] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const listItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      if (!normalizedSearch) return true;

      const haystack = [item.title, item.creatorName, getContentTypeMeta(item.contentType).label].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [items, searchTerm]);

  function openNewPage() {
    setEditorDraft(makeInitialDraft());
  }

  function openEditPage(item) {
    setEditorDraft({
      ...makeInitialDraft(),
      ...item,
      publishedAt: toDateTimeLocalValue(item.publishedAt),
      likes: Number(item.likes || 0),
      reach: Number(item.reach || 0),
      contentType: item.contentType || 'simple_image',
      description: item.description || '',
      mediaGallery: item.mediaGallery || '',
      pollOptions: Array.isArray(item.pollOptions) ? item.pollOptions : ['Opção 1', 'Opção 2', '', ''],
      question: item.question || '',
      audioUrl: item.audioUrl || ''
    });
  }

  function updateDraft(field, value) {
    setEditorDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function submitDraft(nextStatus) {
    if (!editorDraft) return;

    const normalized = normalizeDraftForSave(editorDraft, nextStatus);
    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.id === normalized.id);
      if (existingIndex === -1) return [normalized, ...current];
      const next = [...current];
      next[existingIndex] = normalized;
      return next;
    });
    setEditorDraft(null);
  }

  function toggleItem(item) {
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: entry.status === 'inactive' ? 'published' : 'inactive'
            }
          : entry
      )
    );
  }

  function deleteItem(item) {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setPreviewItem((current) => (current?.id === item.id ? null : current));
  }

  if (editorDraft) {
    return <ContentEditorPage draft={editorDraft} onChange={updateDraft} onBack={() => setEditorDraft(null)} onSubmit={submitDraft} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Conteúdo"
        subtitle="Operação editorial do time de marketing para o que aparece na plataforma."
        actions={
          <Button onClick={openNewPage}>
            <Plus className="h-4 w-4" />
            Adicionar novo
          </Button>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar posts no feed"
            className="pl-9"
          />
        </div>
      </div>

      <Table className="bg-transparent text-foreground">
            <TableHeader className="bg-secondary/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Conteúdo</TableHead>
                <TableHead className="text-muted-foreground">Criador</TableHead>
                <TableHead className="text-muted-foreground">Engajamento</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Likes</TableHead>
                <TableHead className="text-muted-foreground">Alcance</TableHead>
                <TableHead className="text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listItems.map((item) => {
                const status = STATUS_META[item.status] || STATUS_META.inactive;
                const isActive = item.status !== 'inactive';
                const typeMeta = getContentTypeMeta(item.contentType);
                const engagement = getEngagementMeta(item);

                return (
                  <TableRow key={item.id} className="border-border hover:bg-secondary/35">
                    <TableCell className="w-[118px]">
                      <div className="flex items-center gap-3 text-sm text-foreground">
                        <StatusDot variant={status.dot} />
                        <StatusSwitch checked={isActive} onClick={() => toggleItem(item)} />
                      </div>
                    </TableCell>

                    <TableCell className="min-w-[340px]">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="admin-content-feed-preview-trigger group relative h-24 w-32 shrink-0 overflow-hidden rounded-[12px] text-left"
                          aria-label={`Abrir preview de ${item.title}`}
                        >
                          <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                          <span className="absolute inset-0 flex items-center justify-center bg-background/20 opacity-0 transition group-hover:opacity-100">
                            {item.type === 'video' ? <Video className="h-6 w-6 text-foreground" /> : <Eye className="h-6 w-6 text-foreground" />}
                          </span>
                          <span className="absolute bottom-2 left-2">
                            <Badge variant="neutral">{item.type === 'video' ? 'Vídeo' : 'Imagem'}</Badge>
                          </span>
                        </button>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{typeMeta.label}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="w-[160px] text-sm text-muted-foreground">{item.creatorName || '-'}</TableCell>

                    <TableCell className="w-[140px]">
                      <Badge variant={engagement.variant}>{engagement.label}</Badge>
                    </TableCell>

                    <TableCell className="w-[180px]">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(item.publishedAt)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="w-[120px]">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span>{formatCompact(item.likes)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="w-[120px]">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{formatCompact(item.reach)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="w-[124px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPage(item)}
                          className="admin-content-feed-edit-btn inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-foreground transition"
                          aria-label={`Editar ${item.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item)}
                          className="admin-content-feed-edit-btn inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-foreground transition"
                          aria-label={`Apagar ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
      </Table>

      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
