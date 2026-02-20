import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, PenSquare, Plus, Trash2, Users } from 'lucide-react';
import { communitiesService } from '../services/communitiesService';

function formatRelativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'agora';
  const diffMin = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 60) return `há ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function getPostsSorted(posts = [], sortBy = 'recent') {
  const safe = [...posts];
  if (sortBy === 'likes') return safe.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  if (sortBy === 'comments') return safe.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
  return safe.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BuzzCommunitiesPanel() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState('');

  const [communityEditor, setCommunityEditor] = useState({
    open: false,
    mode: 'create',
    id: '',
    name: '',
    description: '',
    previewUrl: '',
    coverUrl: ''
  });

  const [postDraft, setPostDraft] = useState({ text: '', imageUrl: '' });
  const [postEditId, setPostEditId] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpen, setReplyOpen] = useState({});
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    communitiesService
      .listCommunities()
      .then((data) => {
        setCommunities(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch(() => setError('Falha ao carregar comunidades.'))
      .finally(() => setLoading(false));
  }, []);

  const currentUser = communitiesService.currentUser;

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId) || null,
    [communities, selectedCommunityId]
  );

  const filteredCommunities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return communities;
    return communities.filter((community) => String(community.name || '').toLowerCase().includes(query));
  }, [communities, searchTerm]);

  const selectedPosts = useMemo(() => getPostsSorted(selectedCommunity?.posts || [], sortBy), [selectedCommunity?.posts, sortBy]);

  function isCreator(community) {
    return community.creatorId === currentUser.id;
  }

  function isJoined(community) {
    return community.members.includes(currentUser.id);
  }

  function openCreateCommunity() {
    setCommunityEditor({
      open: true,
      mode: 'create',
      id: '',
      name: '',
      description: '',
      previewUrl: '',
      coverUrl: ''
    });
  }

  function openEditCommunity(community) {
    setCommunityEditor({
      open: true,
      mode: 'edit',
      id: community.id,
      name: community.name || '',
      description: community.description || '',
      previewUrl: community.previewUrl || '',
      coverUrl: community.coverUrl || ''
    });
  }

  function closeCommunityEditor() {
    setCommunityEditor((prev) => ({ ...prev, open: false }));
  }

  async function onCommunityFile(event, target) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataUrl(file);
      if (target === 'preview') {
        setCommunityEditor((prev) => ({ ...prev, previewUrl: dataUrl || '' }));
      } else {
        setCommunityEditor((prev) => ({ ...prev, coverUrl: dataUrl || '' }));
      }
    } catch {
      setError('Não foi possível carregar imagem da comunidade.');
    }
  }

  function saveCommunity() {
    const name = communityEditor.name.trim();
    const description = communityEditor.description.trim();
    if (!name || !description) {
      setError('Nome e descrição são obrigatórios para a comunidade.');
      return;
    }

    setCommunities((prev) => {
      if (communityEditor.mode === 'edit' && communityEditor.id) {
        return communitiesService.updateCommunity(prev, communityEditor.id, {
          name,
          description,
          previewUrl: communityEditor.previewUrl,
          coverUrl: communityEditor.coverUrl
        });
      }
      return communitiesService.createCommunity(prev, {
        name,
        description,
        previewUrl: communityEditor.previewUrl,
        coverUrl: communityEditor.coverUrl
      });
    });

    setError('');
    closeCommunityEditor();
  }

  function removeCommunity(communityId) {
    setCommunities((prev) => communitiesService.deleteCommunity(prev, communityId));
    if (selectedCommunityId === communityId) setSelectedCommunityId('');
    setMenuOpenId('');
  }

  function toggleMembership(community) {
    setCommunities((prev) =>
      isJoined(community) ? communitiesService.leaveCommunity(prev, community.id) : communitiesService.joinCommunity(prev, community.id)
    );
    setMenuOpenId('');
  }

  async function onPostImageFile(event, target = 'post', key = '') {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await readImageAsDataUrl(file);
      if (target === 'post') {
        setPostDraft((prev) => ({ ...prev, imageUrl: imageUrl || '' }));
      } else if (target === 'comment') {
        setCommentDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || { text: '' }), imageUrl: imageUrl || '' } }));
      } else if (target === 'reply') {
        setReplyDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || { text: '' }), imageUrl: imageUrl || '' } }));
      }
    } catch {
      setError('Não foi possível carregar a imagem.');
    }
  }

  function submitPost() {
    if (!selectedCommunity || !isJoined(selectedCommunity)) return;
    const text = postDraft.text.trim();
    if (!text && !postDraft.imageUrl) {
      setError('Escreva algo ou anexe uma imagem no post.');
      return;
    }

    setCommunities((prev) => {
      if (postEditId) {
        return communitiesService.updatePost(prev, selectedCommunity.id, postEditId, {
          text,
          imageUrl: postDraft.imageUrl || null
        });
      }
      return communitiesService.createPost(prev, selectedCommunity.id, {
        text,
        imageUrl: postDraft.imageUrl || null
      });
    });

    setPostDraft({ text: '', imageUrl: '' });
    setPostEditId('');
    setError('');
  }

  function editPost(post) {
    setPostEditId(post.id);
    setPostDraft({ text: post.text || '', imageUrl: post.imageUrl || '' });
  }

  function deletePost(postId) {
    if (!selectedCommunity) return;
    setCommunities((prev) => communitiesService.deletePost(prev, selectedCommunity.id, postId));
    if (postEditId === postId) {
      setPostEditId('');
      setPostDraft({ text: '', imageUrl: '' });
    }
  }

  function togglePostLike(postId) {
    if (!selectedCommunity || !isJoined(selectedCommunity)) return;
    setCommunities((prev) => communitiesService.togglePostLike(prev, selectedCommunity.id, postId));
  }

  function submitComment(postId) {
    if (!selectedCommunity || !isJoined(selectedCommunity)) return;
    const key = `comment:${postId}`;
    const draft = commentDrafts[key] || { text: '', imageUrl: '' };
    const text = String(draft.text || '').trim();
    if (!text && !draft.imageUrl) return;
    setCommunities((prev) => communitiesService.createComment(prev, selectedCommunity.id, postId, { text, imageUrl: draft.imageUrl || null }));
    setCommentDrafts((prev) => ({ ...prev, [key]: { text: '', imageUrl: '' } }));
  }

  function toggleCommentLike(postId, commentId) {
    if (!selectedCommunity || !isJoined(selectedCommunity)) return;
    setCommunities((prev) => communitiesService.toggleCommentLike(prev, selectedCommunity.id, postId, commentId));
  }

  function toggleReply(postId, commentId) {
    if (!selectedCommunity || !isJoined(selectedCommunity)) return;
    const key = `reply-open:${postId}:${commentId}`;
    setReplyOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submitReply(postId, commentId) {
    if (!selectedCommunity || !isJoined(selectedCommunity)) return;
    const key = `reply:${postId}:${commentId}`;
    const draft = replyDrafts[key] || { text: '', imageUrl: '' };
    const text = String(draft.text || '').trim();
    if (!text && !draft.imageUrl) return;
    setCommunities((prev) => communitiesService.createReply(prev, selectedCommunity.id, postId, commentId, { text, imageUrl: draft.imageUrl || null }));
    setReplyDrafts((prev) => ({ ...prev, [key]: { text: '', imageUrl: '' } }));
    setReplyOpen((prev) => ({ ...prev, [`reply-open:${postId}:${commentId}`]: false }));
  }

  function renderCommunityMenu(community, compact = false) {
    const creator = isCreator(community);
    const joined = isJoined(community);
    if (!creator && !joined) return null;
    const open = menuOpenId === community.id;

    return (
      <div className="buzz-menu-wrap">
        <button
          type="button"
          className={compact ? 'social-comment-like' : 'feed-link secondary'}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpenId(open ? '' : community.id);
          }}
          aria-expanded={open ? 'true' : 'false'}
          aria-haspopup="menu"
        >
          <MoreHorizontal size={14} />
        </button>
        {open ? (
          <div className="buzz-menu" role="menu">
            {creator ? (
              <>
                <button type="button" role="menuitem" onClick={() => openEditCommunity(community)}>
                  Editar
                </button>
                <button type="button" role="menuitem" onClick={() => removeCommunity(community.id)}>
                  Excluir
                </button>
              </>
            ) : null}
            {joined ? (
              <button type="button" role="menuitem" onClick={() => toggleMembership(community)}>
                Sair da comunidade
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (loading) return <div className="feed-empty">Carregando comunidades...</div>;

  if (!selectedCommunity) {
    return (
      <section className="buzz-layout">
        <div className="buzz-toolbar">
          <h3>Comunidades</h3>
          <button type="button" className="show-ticket-btn" onClick={openCreateCommunity}>
            <Plus size={14} />
            Nova comunidade
          </button>
        </div>

        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar comunidade por nome"
          className="buzz-search-input"
          aria-label="Buscar comunidades"
        />

        {error ? <p className="buzz-error">{error}</p> : null}

        {communityEditor.open ? (
          <div className="buzz-card buzz-editor">
            <h4>{communityEditor.mode === 'edit' ? 'Editar comunidade' : 'Criar comunidade'}</h4>
            <input value={communityEditor.name} onChange={(event) => setCommunityEditor((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nome" />
            <textarea
              value={communityEditor.description}
              onChange={(event) => setCommunityEditor((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descrição"
              rows={3}
            />

            <div className="buzz-inline-actions">
              <label className="buzz-upload-btn" htmlFor="community-preview-upload">
                <ImageIcon size={14} />
                Imagem quadrada
              </label>
              <input id="community-preview-upload" type="file" accept="image/*" onChange={(event) => onCommunityFile(event, 'preview')} className="buzz-hidden-input" />

              <label className="buzz-upload-btn" htmlFor="community-cover-upload">
                <ImageIcon size={14} />
                Capa retangular
              </label>
              <input id="community-cover-upload" type="file" accept="image/*" onChange={(event) => onCommunityFile(event, 'cover')} className="buzz-hidden-input" />
            </div>

            {communityEditor.previewUrl ? <img src={communityEditor.previewUrl} alt="Preview da comunidade" className="buzz-preview-square" /> : null}
            {communityEditor.coverUrl ? <img src={communityEditor.coverUrl} alt="Capa da comunidade" className="buzz-cover-preview" /> : null}

            <div className="buzz-inline-actions">
              <button type="button" className="show-ticket-btn" onClick={saveCommunity}>
                Salvar
              </button>
              <button type="button" className="feed-link secondary" onClick={closeCommunityEditor}>
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        <div className="shows-list buzz-communities-row" role="list">
          {filteredCommunities.map((community) => (
            <div
              key={community.id}
              role="button"
              tabIndex={0}
              className="show-card buzz-community-card"
              aria-label={`Abrir comunidade ${community.name}`}
              onClick={() => setSelectedCommunityId(community.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedCommunityId(community.id);
                }
              }}
            >
              <img src={community.previewUrl || community.coverUrl || 'https://picsum.photos/seed/community-default/240/240'} alt={community.name} className="show-thumb buzz-square-thumb" />
              <div className="show-copy buzz-community-copy">
                <button
                  type="button"
                  className="show-artist buzz-community-title"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedCommunityId(community.id);
                  }}
                >
                  {community.name}
                </button>
                <p className="show-meta">{community.membersCount} membros • {community.postsCount} posts • {formatRelativeDate(community.lastActivity)}</p>
              </div>
              {renderCommunityMenu(community)}
            </div>
          ))}
          {!filteredCommunities.length ? <div className="feed-empty">Nenhuma comunidade encontrada.</div> : null}
        </div>
      </section>
    );
  }

  const joined = isJoined(selectedCommunity);
  const creator = isCreator(selectedCommunity);

  return (
    <section className="buzz-layout">
      <div className="buzz-toolbar">
        <button type="button" className="feed-link secondary" onClick={() => setSelectedCommunityId('')}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <h3>{selectedCommunity.name}</h3>
        <div className="buzz-inline-actions">
          {!joined ? (
            <button type="button" className="show-ticket-btn" onClick={() => toggleMembership(selectedCommunity)}>
              Participar
            </button>
          ) : null}
          {renderCommunityMenu(selectedCommunity, true)}
        </div>
      </div>

      <div className="buzz-card buzz-community-header">
        <img src={selectedCommunity.coverUrl || selectedCommunity.previewUrl || 'https://picsum.photos/seed/community-default-detail/1200/420'} alt={selectedCommunity.name} className="buzz-community-cover" />
        <p>{selectedCommunity.description}</p>
        <div className="buzz-stats-row">
          <span>
            <Users size={13} /> {selectedCommunity.membersCount} membros
          </span>
          <span>
            <MessageCircle size={13} /> {selectedCommunity.postsCount} posts
          </span>
          <span>Última atividade: {formatRelativeDate(selectedCommunity.lastActivity)}</span>
        </div>
        {creator ? (
          <div className="buzz-inline-actions">
            <button type="button" className="feed-link secondary" onClick={() => openEditCommunity(selectedCommunity)}>
              Editar comunidade
            </button>
            <button type="button" className="feed-link secondary" onClick={() => removeCommunity(selectedCommunity.id)}>
              Excluir comunidade
            </button>
          </div>
        ) : null}
      </div>

      <div className="buzz-card buzz-editor">
        <h4>{postEditId ? 'Editar post' : 'Novo post'}</h4>
        {!joined ? <p className="buzz-error">Participe da comunidade para publicar e interagir.</p> : null}
        <textarea value={postDraft.text} onChange={(event) => setPostDraft((prev) => ({ ...prev, text: event.target.value }))} rows={3} placeholder="Compartilhe algo com a comunidade" />
        <label className="buzz-upload-btn" htmlFor="post-image-upload">
          <ImageIcon size={14} />
          Imagem
        </label>
        <input id="post-image-upload" type="file" accept="image/*" className="buzz-hidden-input" onChange={(event) => onPostImageFile(event, 'post')} disabled={!joined} />
        {postDraft.imageUrl ? <img src={postDraft.imageUrl} alt="Preview do post" className="buzz-post-image" /> : null}
        <div className="buzz-inline-actions">
          <button type="button" className="show-ticket-btn" onClick={submitPost} disabled={!joined}>
            {postEditId ? 'Salvar edição' : 'Publicar'}
          </button>
          {postEditId ? (
            <button
              type="button"
              className="feed-link secondary"
              onClick={() => {
                setPostEditId('');
                setPostDraft({ text: '', imageUrl: '' });
              }}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      <div className="buzz-sort-row">
        <button type="button" className={sortBy === 'recent' ? 'feed-tab active' : 'feed-tab'} onClick={() => setSortBy('recent')}>
          Mais recentes
        </button>
        <button type="button" className={sortBy === 'comments' ? 'feed-tab active' : 'feed-tab'} onClick={() => setSortBy('comments')}>
          Mais comentados
        </button>
        <button type="button" className={sortBy === 'likes' ? 'feed-tab active' : 'feed-tab'} onClick={() => setSortBy('likes')}>
          Mais curtidos
        </button>
      </div>

      <div className="buzz-posts-list">
        {selectedPosts.map((post) => {
          const liked = post.likes.includes(currentUser.id);
          const postOwner = post.authorId === currentUser.id;
          const commentDraftKey = `comment:${post.id}`;
          const commentDraft = commentDrafts[commentDraftKey] || { text: '', imageUrl: '' };
          return (
            <article key={post.id} className="buzz-card buzz-post-item">
              <div className="buzz-post-head">
                <div>
                  <strong>{post.authorName}</strong>
                  <p>{formatRelativeDate(post.createdAt)}</p>
                </div>
                {postOwner ? (
                  <div className="buzz-inline-actions">
                    <button type="button" className="social-comment-like" onClick={() => editPost(post)}>
                      <PenSquare size={12} /> Editar
                    </button>
                    <button type="button" className="social-comment-like" onClick={() => deletePost(post.id)}>
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                ) : null}
              </div>

              {post.text ? <p className="buzz-post-text">{post.text}</p> : null}
              {post.imageUrl ? <img src={post.imageUrl} alt="Imagem do post" className="buzz-post-image" /> : null}

              <div className="buzz-stats-row">
                <button type="button" className={liked ? 'social-action liked' : 'social-action'} onClick={() => togglePostLike(post.id)} disabled={!joined}>
                  <Heart size={14} /> {post.likes.length}
                </button>
                <span>
                  <MessageCircle size={14} /> {post.comments.length}
                </span>
              </div>

              <div className="buzz-comment-editor">
                <input
                  value={commentDraft.text}
                  onChange={(event) =>
                    setCommentDrafts((prev) => ({
                      ...prev,
                      [commentDraftKey]: { ...commentDraft, text: event.target.value }
                    }))
                  }
                  placeholder="Comente"
                  disabled={!joined}
                />
                <label className="buzz-upload-btn" htmlFor={`comment-image-upload-${post.id}`}>
                  <ImageIcon size={13} />
                </label>
                <input
                  id={`comment-image-upload-${post.id}`}
                  type="file"
                  accept="image/*"
                  className="buzz-hidden-input"
                  onChange={(event) => onPostImageFile(event, 'comment', commentDraftKey)}
                  disabled={!joined}
                />
                <button type="button" className="social-send-btn" onClick={() => submitComment(post.id)} disabled={!joined}>
                  Enviar
                </button>
              </div>
              {commentDraft.imageUrl ? <img src={commentDraft.imageUrl} alt="Imagem do comentário" className="buzz-comment-image" /> : null}

              <div className="buzz-comments-list">
                {post.comments.map((comment) => {
                  const replyKey = `reply:${post.id}:${comment.id}`;
                  const replyOpenKey = `reply-open:${post.id}:${comment.id}`;
                  const replyDraft = replyDrafts[replyKey] || { text: '', imageUrl: '' };
                  const commentLiked = comment.likes.includes(currentUser.id);
                  return (
                    <div key={comment.id} className="buzz-comment-item">
                      <p>
                        <strong>{comment.authorName}</strong> {comment.text}
                      </p>
                      {comment.imageUrl ? <img src={comment.imageUrl} alt="Imagem do comentário" className="buzz-comment-image" /> : null}
                      <div className="buzz-inline-actions">
                        <button type="button" className={commentLiked ? 'social-comment-like liked' : 'social-comment-like'} onClick={() => toggleCommentLike(post.id, comment.id)} disabled={!joined}>
                          <Heart size={11} /> {comment.likes.length}
                        </button>
                        <button type="button" className="social-comment-like" onClick={() => toggleReply(post.id, comment.id)} disabled={!joined}>
                          Responder
                        </button>
                      </div>

                      {(comment.replies || []).map((reply) => (
                        <div key={reply.id} className="buzz-reply-item">
                          <p>
                            <strong>{reply.authorName}</strong> {reply.text}
                          </p>
                          {reply.imageUrl ? <img src={reply.imageUrl} alt="Imagem da resposta" className="buzz-comment-image" /> : null}
                        </div>
                      ))}

                      {replyOpen[replyOpenKey] ? (
                        <div className="buzz-comment-editor buzz-reply-editor">
                          <input
                            value={replyDraft.text}
                            onChange={(event) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [replyKey]: { ...replyDraft, text: event.target.value }
                              }))
                            }
                            placeholder="Responder comentário"
                            disabled={!joined}
                          />
                          <label className="buzz-upload-btn" htmlFor={`reply-image-upload-${post.id}-${comment.id}`}>
                            <ImageIcon size={13} />
                          </label>
                          <input
                            id={`reply-image-upload-${post.id}-${comment.id}`}
                            type="file"
                            accept="image/*"
                            className="buzz-hidden-input"
                            onChange={(event) => onPostImageFile(event, 'reply', replyKey)}
                            disabled={!joined}
                          />
                          <button type="button" className="social-send-btn" onClick={() => submitReply(post.id, comment.id)} disabled={!joined}>
                            Enviar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}

        {!selectedPosts.length ? <div className="feed-empty">Ainda não há posts nesta comunidade.</div> : null}
      </div>
    </section>
  );
}
