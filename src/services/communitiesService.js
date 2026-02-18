const CURRENT_USER = { id: 'current-user', name: 'voce' };

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byDateDesc(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function makeSeedCommunities() {
  const now = Date.now();
  return [
    {
      id: 'community-country-night',
      name: 'Country Night BR',
      description: 'Comunidade para discutir lançamentos, setlists e agenda dos shows country no Brasil.',
      coverUrl: 'https://picsum.photos/seed/community-country-night/1200/420',
      category: 'Country',
      creatorId: CURRENT_USER.id,
      creatorName: CURRENT_USER.name,
      admins: [CURRENT_USER.id],
      members: [CURRENT_USER.id, 'u-ana', 'u-lucas', 'u-bianca'],
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 6).toISOString(),
      posts: [
        {
          id: 'post-country-1',
          authorId: 'u-ana',
          authorName: 'ana.souza',
          text: 'Qual foi o melhor show do mês para vocês?',
          imageUrl: 'https://picsum.photos/seed/community-post-country-1/960/560',
          createdAt: new Date(now - 1000 * 60 * 50).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 50).toISOString(),
          likes: ['u-lucas', CURRENT_USER.id],
          comments: [
            {
              id: 'comment-country-1',
              authorId: 'u-lucas',
              authorName: 'lucas.violao',
              text: 'Para mim foi Londrina, energia absurda.',
              imageUrl: null,
              createdAt: new Date(now - 1000 * 60 * 44).toISOString(),
              likes: [CURRENT_USER.id],
              replies: [
                {
                  id: 'reply-country-1',
                  authorId: CURRENT_USER.id,
                  authorName: CURRENT_USER.name,
                  text: 'Concordo, palco e som estavam perfeitos.',
                  imageUrl: null,
                  createdAt: new Date(now - 1000 * 60 * 40).toISOString(),
                  likes: []
                }
              ]
            }
          ]
        },
        {
          id: 'post-country-2',
          authorId: CURRENT_USER.id,
          authorName: CURRENT_USER.name,
          text: 'Fiz essa playlist para o pré-show, aceito sugestões.',
          imageUrl: null,
          createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 18).toISOString(),
          likes: ['u-ana'],
          comments: []
        }
      ]
    },
    {
      id: 'community-sertanejo-universitario',
      name: 'Sertanejo Universitário',
      description: 'Debates sobre músicas novas, trends e experiências ao vivo da galera.',
      coverUrl: 'https://picsum.photos/seed/community-sertanejo/1200/420',
      category: 'Sertanejo',
      creatorId: 'u-bianca',
      creatorName: 'bianca.music',
      admins: ['u-bianca'],
      members: ['u-bianca', 'u-ana', CURRENT_USER.id],
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 13).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 20).toISOString(),
      posts: []
    }
  ];
}

function withActivity(community) {
  const postDates = (community.posts || []).flatMap((post) => {
    const commentDates = (post.comments || []).flatMap((comment) => {
      const replyDates = (comment.replies || []).map((reply) => reply.createdAt);
      return [comment.createdAt, ...replyDates];
    });
    return [post.createdAt, ...commentDates];
  });
  const lastActivity = [community.updatedAt, ...postDates]
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return {
    ...community,
    postsCount: (community.posts || []).length,
    membersCount: (community.members || []).length,
    lastActivity: lastActivity || community.updatedAt || community.createdAt || nowIso()
  };
}

function listOrdered(communities) {
  return communities.map(withActivity).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

export const communitiesService = {
  currentUser: CURRENT_USER,

  async listCommunities() {
    return listOrdered(deepClone(makeSeedCommunities()));
  },

  createCommunity(communities, payload) {
    const now = nowIso();
    const next = deepClone(communities);
    next.unshift({
      id: makeId('community'),
      name: String(payload.name || '').trim(),
      description: String(payload.description || '').trim(),
      coverUrl: payload.coverUrl || null,
      category: String(payload.category || '').trim() || null,
      creatorId: CURRENT_USER.id,
      creatorName: CURRENT_USER.name,
      admins: [CURRENT_USER.id],
      members: [CURRENT_USER.id],
      createdAt: now,
      updatedAt: now,
      posts: []
    });
    return listOrdered(next);
  },

  updateCommunity(communities, communityId, patch) {
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        name: String(patch.name || community.name).trim(),
        description: String(patch.description ?? community.description).trim(),
        coverUrl: patch.coverUrl ?? community.coverUrl,
        category: String((patch.category ?? community.category) || '').trim() || null,
        updatedAt: nowIso()
      };
    });
    return listOrdered(next);
  },

  deleteCommunity(communities, communityId) {
    return listOrdered(deepClone(communities).filter((community) => community.id !== communityId));
  },

  joinCommunity(communities, communityId) {
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      if (community.members.includes(CURRENT_USER.id)) return community;
      return {
        ...community,
        members: [...community.members, CURRENT_USER.id],
        updatedAt: nowIso()
      };
    });
    return listOrdered(next);
  },

  leaveCommunity(communities, communityId) {
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      if (!community.members.includes(CURRENT_USER.id)) return community;
      if (community.creatorId === CURRENT_USER.id) return community;
      return {
        ...community,
        admins: community.admins.filter((adminId) => adminId !== CURRENT_USER.id),
        members: community.members.filter((memberId) => memberId !== CURRENT_USER.id),
        updatedAt: nowIso()
      };
    });
    return listOrdered(next);
  },

  createPost(communities, communityId, payload) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      const post = {
        id: makeId('post'),
        authorId: CURRENT_USER.id,
        authorName: CURRENT_USER.name,
        text: String(payload.text || '').trim(),
        imageUrl: payload.imageUrl || null,
        createdAt: now,
        updatedAt: now,
        likes: [],
        comments: []
      };
      return {
        ...community,
        posts: [post, ...(community.posts || [])],
        updatedAt: now
      };
    });
    return listOrdered(next);
  },

  updatePost(communities, communityId, postId, patch) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        posts: (community.posts || []).map((post) =>
          post.id === postId
            ? {
                ...post,
                text: String(patch.text ?? post.text).trim(),
                imageUrl: patch.imageUrl ?? post.imageUrl,
                updatedAt: now
              }
            : post
        ),
        updatedAt: now
      };
    });
    return listOrdered(next);
  },

  deletePost(communities, communityId, postId) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        posts: (community.posts || []).filter((post) => post.id !== postId),
        updatedAt: now
      };
    });
    return listOrdered(next);
  },

  togglePostLike(communities, communityId, postId) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        posts: (community.posts || []).map((post) => {
          if (post.id !== postId) return post;
          const liked = post.likes.includes(CURRENT_USER.id);
          return {
            ...post,
            likes: liked ? post.likes.filter((id) => id !== CURRENT_USER.id) : [...post.likes, CURRENT_USER.id],
            updatedAt: now
          };
        }),
        updatedAt: now
      };
    });
    return listOrdered(next);
  },

  createComment(communities, communityId, postId, payload) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        posts: (community.posts || []).map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: [
              {
                id: makeId('comment'),
                authorId: CURRENT_USER.id,
                authorName: CURRENT_USER.name,
                text: String(payload.text || '').trim(),
                imageUrl: payload.imageUrl || null,
                createdAt: now,
                likes: [],
                replies: []
              },
              ...(post.comments || [])
            ],
            updatedAt: now
          };
        }),
        updatedAt: now
      };
    });
    return listOrdered(next);
  },

  toggleCommentLike(communities, communityId, postId, commentId) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        posts: (community.posts || []).map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: (post.comments || []).map((comment) => {
              if (comment.id !== commentId) return comment;
              const liked = comment.likes.includes(CURRENT_USER.id);
              return {
                ...comment,
                likes: liked ? comment.likes.filter((id) => id !== CURRENT_USER.id) : [...comment.likes, CURRENT_USER.id]
              };
            }),
            updatedAt: now
          };
        }),
        updatedAt: now
      };
    });
    return listOrdered(next);
  },

  createReply(communities, communityId, postId, commentId, payload) {
    const now = nowIso();
    const next = deepClone(communities).map((community) => {
      if (community.id !== communityId) return community;
      return {
        ...community,
        posts: (community.posts || []).map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: (post.comments || []).map((comment) => {
              if (comment.id !== commentId) return comment;
              return {
                ...comment,
                replies: [
                  ...(comment.replies || []),
                  {
                    id: makeId('reply'),
                    authorId: CURRENT_USER.id,
                    authorName: CURRENT_USER.name,
                    text: String(payload.text || '').trim(),
                    imageUrl: payload.imageUrl || null,
                    createdAt: now,
                    likes: []
                  }
                ]
              };
            }),
            updatedAt: now
          };
        }),
        updatedAt: now
      };
    });
    return listOrdered(next);
  }
};
