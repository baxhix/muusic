import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Heart, MessageCircle } from 'lucide-react';
import { API_URL } from '../config/appConfig';

function buildInitialPosts() {
  const base = [
    {
      id: 'post-1',
      user: 'ana.souza',
      name: 'Ana Souza',
      city: 'São Paulo',
      country: 'Brasil',
      coords: [-46.6333, -23.5505],
      ago: 'há 12 min',
      caption: 'Partiu show hoje, alguém mais indo?',
      image: 'https://picsum.photos/seed/feed-ana/900/900',
      likes: 128,
      liked: false,
      comments: [
        {
          id: 'c-1-1',
          user: 'cadu.music',
          text: 'Fechei ingresso agora.',
          likes: 3,
          liked: false,
          replies: [{ id: 'r-1-1-1', user: 'ana.souza', text: 'Bora!' }]
        }
      ]
    },
    {
      id: 'post-2',
      user: 'rafaela.melo',
      name: 'Rafaela Melo',
      city: 'Goiânia',
      country: 'Brasil',
      coords: [-49.2643, -16.6869],
      ago: 'há 24 min',
      caption: 'Setlist perfeito. Energia absurda no palco.',
      image: 'https://picsum.photos/seed/feed-rafa/900/900',
      likes: 247,
      liked: true,
      comments: [
        {
          id: 'c-2-1',
          user: 'leo.pires',
          text: 'Essa música final foi sinistra.',
          likes: 8,
          liked: false,
          replies: []
        },
        {
          id: 'c-2-2',
          user: 'mari.brito',
          text: 'Quero esse replay no feed.',
          likes: 5,
          liked: false,
          replies: []
        }
      ]
    },
    {
      id: 'post-3',
      user: 'joaopedro.dj',
      name: 'João Pedro',
      city: 'Belo Horizonte',
      country: 'Brasil',
      coords: [-43.9409, -19.9167],
      ago: 'há 39 min',
      caption: 'Pré-show com a galera. Hoje promete muito.',
      image: 'https://picsum.photos/seed/feed-joao/900/900',
      likes: 91,
      liked: false,
      comments: []
    },
    {
      id: 'post-4',
      user: 'carol.nunes',
      name: 'Carol Nunes',
      city: 'Curitiba',
      country: 'Brasil',
      coords: [-49.2733, -25.4284],
      ago: 'há 1 h',
      caption: 'Achei esse som novo no after e já virou vício.',
      image: 'https://picsum.photos/seed/feed-carol/900/900',
      likes: 302,
      liked: false,
      comments: [
        {
          id: 'c-4-1',
          user: 'gui.santos',
          text: 'Manda o nome da faixa.',
          likes: 2,
          liked: false,
          replies: [{ id: 'r-4-1-1', user: 'carol.nunes', text: 'Te enviei no chat.' }]
        }
      ]
    }
  ];

  return base.map((post, index) => ({
    ...post,
    avatar: `https://i.pravatar.cc/120?img=${index + 12}`
  }));
}

export default function RealFeedLite({ onFocusItem, onOpenItem, collapsed, onToggleCollapse }) {
  const [activeTab, setActiveTab] = useState('feed');
  const [feedPosts, setFeedPosts] = useState(() => buildInitialPosts());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpen, setReplyOpen] = useState({});

  const [shows, setShows] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fallbackShows = [
      {
        id: 'fallback-show-1',
        artist: 'Jorge & Mateus',
        venue: 'Villa Country',
        city: 'Sao Paulo',
        country: 'Brasil',
        latitude: -23.536,
        longitude: -46.664,
        startsAt: new Date(Date.now() + 4 * 86400000).toISOString(),
        thumbUrl: 'https://picsum.photos/seed/fallback-show-1/112/112'
      },
      {
        id: 'fallback-show-2',
        artist: 'Henrique & Juliano',
        venue: 'Espaco Hall',
        city: 'Rio de Janeiro',
        country: 'Brasil',
        latitude: -22.874,
        longitude: -43.364,
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        thumbUrl: 'https://picsum.photos/seed/fallback-show-2/112/112'
      },
      {
        id: 'fallback-show-3',
        artist: 'Maiara & Maraisa',
        venue: 'Pedra do Canto',
        city: 'Goiania',
        country: 'Brasil',
        latitude: -16.6869,
        longitude: -49.2643,
        startsAt: new Date(Date.now() + 10 * 86400000).toISOString(),
        thumbUrl: 'https://picsum.photos/seed/fallback-show-3/112/112'
      }
    ];

    const loadShows = async () => {
      try {
        const response = await fetch(`${API_URL}/api/shows?page=1&limit=200`, {
          cache: 'no-store'
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Falha ao carregar shows.');
        const list = Array.isArray(payload.shows) ? payload.shows : [];
        if (!cancelled) {
          setShows(list.length ? list : fallbackShows);
        }
      } catch {
        if (!cancelled) {
          setShows(fallbackShows);
        }
      }
    };

    loadShows();
    const intervalId = window.setInterval(loadShows, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const showsForRender = useMemo(() => {
    const monthAbbr = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return shows.map((show) => {
      const date = new Date(show.startsAt);
      const dateLabel = Number.isNaN(date.getTime()) ? 'Data a confirmar' : `${date.getDate()} de ${monthAbbr[date.getMonth()]}`;
      return {
        id: show.id,
        artist: show.artist,
        venue: show.venue,
        city: show.city,
        country: show.country || 'Brasil',
        coords: [Number(show.longitude), Number(show.latitude)],
        dateLabel,
        thumb: show.thumbUrl || `https://picsum.photos/seed/${encodeURIComponent(show.artist || show.id)}/112/112`
      };
    });
  }, [shows]);

  function toggleLike(postId) {
    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const nextLiked = !post.liked;
        return {
          ...post,
          liked: nextLiked,
          likes: nextLiked ? post.likes + 1 : Math.max(0, post.likes - 1)
        };
      })
    );
  }

  function addComment(postId) {
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) return;

    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, { id: `c-${postId}-${Date.now()}`, user: 'voce', text: draft, likes: 0, liked: false, replies: [] }]
            }
          : post
      )
    );

    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  }

  function toggleReplyInput(postId, commentId) {
    const key = `${postId}:${commentId}`;
    setReplyOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addReply(postId, commentId) {
    const key = `${postId}:${commentId}`;
    const draft = (replyDrafts[key] || '').trim();
    if (!draft) return;

    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [...comment.replies, { id: `r-${commentId}-${Date.now()}`, user: 'voce', text: draft }]
                }
              : comment
          )
        };
      })
    );

    setReplyDrafts((prev) => ({ ...prev, [key]: '' }));
    setReplyOpen((prev) => ({ ...prev, [key]: false }));
  }

  function toggleCommentLike(postId, commentId) {
    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.map((comment) => {
            if (comment.id !== commentId) return comment;
            const nextLiked = !comment.liked;
            return {
              ...comment,
              liked: nextLiked,
              likes: nextLiked ? comment.likes + 1 : Math.max(0, comment.likes - 1)
            };
          })
        };
      })
    );
  }

  if (collapsed) {
    return (
      <button type="button" className="right-panel-expand" onClick={onToggleCollapse} aria-label="Expandir painel">
        <ChevronLeft size={18} />
      </button>
    );
  }

  return (
    <div className="right-panel">
      <div className="right-head">
        <div className="feed-tabs">
          <button type="button" className={activeTab === 'feed' ? 'feed-tab active' : 'feed-tab'} onClick={() => setActiveTab('feed')}>
            Feed
          </button>
          <button type="button" className={activeTab === 'buzz' ? 'feed-tab active' : 'feed-tab'} onClick={() => setActiveTab('buzz')}>
            Buzz
          </button>
          <button type="button" className={activeTab === 'shows' ? 'feed-tab active' : 'feed-tab'} onClick={() => setActiveTab('shows')}>
            Shows
          </button>
        </div>
        <button type="button" className="right-panel-collapse" onClick={onToggleCollapse} aria-label="Recolher painel">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="feed-box">
        {activeTab === 'feed' && (
          <div className="social-feed-list">
            {feedPosts.map((post) => (
              <article key={post.id} className="social-card">
                <header className="social-head">
                  <img src={post.avatar} alt={post.name} width="40" height="40" className="social-avatar" />
                  <div className="social-user-copy">
                    <p className="social-username">{post.user}</p>
                    <button
                      type="button"
                      className="social-location"
                      onClick={() => onFocusItem({ coords: post.coords, city: post.city, country: post.country })}
                    >
                      {post.city}, {post.country}
                    </button>
                  </div>
                  <span className="social-time">{post.ago}</span>
                </header>

                <img src={post.image} alt={`Post de ${post.name}`} className="social-media" />

                <div className="social-actions">
                  <button type="button" className={post.liked ? 'social-action liked' : 'social-action'} onClick={() => toggleLike(post.id)}>
                    <Heart size={14} />
                    {post.likes}
                  </button>
                  <button type="button" className="social-action">
                    <MessageCircle size={14} />
                    {post.comments.length}
                  </button>
                </div>

                <p className="social-caption">
                  <strong>{post.user}</strong> {post.caption}
                </p>

                <div className="social-comments">
                  {post.comments.map((comment) => {
                    const key = `${post.id}:${comment.id}`;
                    return (
                      <div key={comment.id} className="social-comment-wrap">
                        <div className="social-comment-row">
                          <p className="social-comment">
                            <strong>{comment.user}</strong> {comment.text}
                          </p>
                          <button
                            type="button"
                            className={comment.liked ? 'social-comment-like liked' : 'social-comment-like'}
                            onClick={() => toggleCommentLike(post.id, comment.id)}
                          >
                            <Heart size={11} />
                            {comment.likes}
                          </button>
                        </div>
                        <button type="button" className="social-reply-toggle" onClick={() => toggleReplyInput(post.id, comment.id)}>
                          Responder
                        </button>

                        {comment.replies.length > 0 && (
                          <div className="social-replies">
                            {comment.replies.map((reply) => (
                              <p key={reply.id} className="social-reply">
                                <strong>{reply.user}</strong> {reply.text}
                              </p>
                            ))}
                          </div>
                        )}

                        {replyOpen[key] && (
                          <div className="social-reply-box">
                            <input
                              value={replyDrafts[key] || ''}
                              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Responder comentário"
                            />
                            <button type="button" className="social-send-btn" onClick={() => addReply(post.id, comment.id)}>
                              Enviar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="social-comment-box">
                  <input
                    value={commentDrafts[post.id] || ''}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder="Adicione um comentário"
                  />
                  <button type="button" className="social-send-btn" onClick={() => addComment(post.id)}>
                    Comentar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'buzz' && <div className="feed-empty">Buzz vazio</div>}

        {activeTab === 'shows' && (
          <div className="shows-list">
            {showsForRender.map((show) => (
              <div key={show.id} className="show-card">
                <img src={show.thumb} alt={show.artist} width="56" height="56" className="show-thumb" />
                <div className="show-copy">
                  <p className="show-artist">{show.artist}</p>
                  <p className="show-meta">
                    {show.dateLabel} •{' '}
                    <button type="button" className="show-venue-link" onClick={() => onFocusItem({ coords: show.coords, city: show.city, country: show.country })}>
                      {show.venue} - {show.city}
                    </button>
                  </p>
                </div>
                <button
                  type="button"
                  className="show-ticket-btn"
                  onClick={() => onOpenItem({ artist: show.artist, city: show.city, country: show.country, coords: show.coords, listeners: 0, likes: 0, comments: 0 })}
                >
                  Ingressos
                </button>
              </div>
            ))}
            {showsForRender.length === 0 && <div className="feed-empty">Nenhum show cadastrado.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
