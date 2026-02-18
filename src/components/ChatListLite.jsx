import { useMemo, useState } from 'react';
import { ChevronLeft, MessageCircle, MoreVertical, Search, SendHorizontal, X } from 'lucide-react';

function buildConversations() {
  return [
    {
      id: 'chat-1',
      user: 'ana.souza',
      name: 'Ana Souza',
      message: 'Cheguei no evento, onde voce esta?',
      time: '21:43',
      unread: 3,
      avatar: 'https://i.pravatar.cc/120?img=15'
    },
    {
      id: 'chat-2',
      user: 'lucas.melo',
      name: 'Lucas Melo',
      message: 'Topa ir no show de sexta?',
      time: '20:10',
      unread: 0,
      avatar: 'https://i.pravatar.cc/120?img=20'
    },
    {
      id: 'chat-3',
      user: 'rafa.nunes',
      name: 'Rafa Nunes',
      message: 'A track nova ficou absurda.',
      time: '19:55',
      unread: 1,
      avatar: 'https://i.pravatar.cc/120?img=25'
    },
    {
      id: 'chat-4',
      user: 'mari.brito',
      name: 'Mariana Brito',
      message: 'Te mando os ingressos no email.',
      time: '18:22',
      unread: 0,
      avatar: 'https://i.pravatar.cc/120?img=29'
    },
    {
      id: 'chat-5',
      user: 'gui.santos',
      name: 'Guilherme Santos',
      message: 'Bora fechar o after hoje?',
      time: '17:03',
      unread: 6,
      avatar: 'https://i.pravatar.cc/120?img=33'
    },
    {
      id: 'chat-6',
      user: 'carol.nunes',
      name: 'Carol Nunes',
      message: 'Me passa sua localizacao no mapa.',
      time: '16:47',
      unread: 0,
      avatar: 'https://i.pravatar.cc/120?img=41'
    }
  ];
}

function buildMessages() {
  return {
    'chat-1': [
      { id: 'm-1-1', text: 'Cheguei no evento, onde voce esta?', mine: false, time: '21:43', reactions: 1, reacted: false },
      { id: 'm-1-2', text: 'Estou na entrada principal.', mine: true, time: '21:44', reactions: 0, reacted: false },
      { id: 'm-1-3', text: 'Perfeito, to indo pra ai.', mine: false, time: '21:45', reactions: 2, reacted: false }
    ],
    'chat-2': [
      { id: 'm-2-1', text: 'Topa ir no show de sexta?', mine: false, time: '20:10', reactions: 0, reacted: false },
      { id: 'm-2-2', text: 'Fechado, me manda o link.', mine: true, time: '20:12', reactions: 1, reacted: false }
    ],
    'chat-3': [{ id: 'm-3-1', text: 'A track nova ficou absurda.', mine: false, time: '19:55', reactions: 0, reacted: false }],
    'chat-4': [{ id: 'm-4-1', text: 'Te mando os ingressos no email.', mine: false, time: '18:22', reactions: 0, reacted: false }],
    'chat-5': [
      { id: 'm-5-1', text: 'Bora fechar o after hoje?', mine: false, time: '17:03', reactions: 1, reacted: false },
      { id: 'm-5-2', text: 'Bora, 23h?', mine: true, time: '17:05', reactions: 0, reacted: false }
    ],
    'chat-6': [{ id: 'm-6-1', text: 'Me passa sua localizacao no mapa.', mine: false, time: '16:47', reactions: 0, reacted: false }]
  };
}

function nowTime() {
  const date = new Date();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function ChatListLite({ open, onToggle }) {
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState(() => buildConversations());
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState(() => buildMessages());
  const [draft, setDraft] = useState('');

  const activeChat = useMemo(() => conversations.find((chat) => chat.id === activeChatId) || null, [conversations, activeChatId]);

  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = conversations.filter((chat) => !chat.archived);
    if (!term) return visible;
    return visible.filter((chat) => chat.name.toLowerCase().includes(term) || chat.user.toLowerCase().includes(term));
  }, [conversations, query]);

  function archiveConversation(chatId) {
    setConversations((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, archived: true } : chat)));
    if (activeChatId === chatId) setActiveChatId(null);
    setMenuOpenId(null);
  }

  function deleteConversation(chatId) {
    setConversations((prev) => prev.filter((chat) => chat.id !== chatId));
    setMessagesByChat((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (activeChatId === chatId) setActiveChatId(null);
    setMenuOpenId(null);
  }

  function openConversation(chatId) {
    setActiveChatId(chatId);
    setConversations((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)));
    setMenuOpenId(null);
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text || !activeChat) return;
    const time = nowTime();

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), { id: `m-${activeChat.id}-${Date.now()}`, text, mine: true, time, reactions: 0, reacted: false }]
    }));

    setConversations((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              message: text,
              time
            }
          : chat
      )
    );

    setDraft('');
  }

  function toggleReaction(messageId) {
    if (!activeChat) return;
    setMessagesByChat((prev) => ({
      ...prev,
      [activeChat.id]: (prev[activeChat.id] || []).map((message) => {
        if (message.id !== messageId) return message;
        const nextReacted = !message.reacted;
        return {
          ...message,
          reacted: nextReacted,
          reactions: nextReacted ? message.reactions + 1 : Math.max(0, message.reactions - 1)
        };
      })
    }));
  }

  if (!open) {
    return (
      <button type="button" className="chat-list-reopen" onClick={onToggle} aria-label="Mostrar conversas">
        <MessageCircle size={14} />
      </button>
    );
  }

  return (
    <aside className={activeChat ? 'chat-list-panel chat-open-thread' : 'chat-list-panel'}>
      {!activeChat && (
        <>
          <header className="chat-list-head">
            <h2>Conversas</h2>
            <button type="button" className="chat-list-hide" onClick={onToggle} aria-label="Ocultar conversas">
              <ChevronLeft size={16} />
            </button>
          </header>

          <div className="chat-list-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar conversas" />
          </div>

          <div className="chat-list-items">
            {filteredConversations.map((chat) => (
              <div
                key={chat.id}
                className="chat-list-item"
                role="button"
                tabIndex={0}
                aria-label={`Abrir conversa com ${chat.name}`}
                onClick={() => openConversation(chat.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openConversation(chat.id);
                  }
                }}
              >
                <img src={chat.avatar} alt={chat.name} className="chat-list-avatar" width="44" height="44" />
                <div className="chat-list-copy">
                  <div className="chat-list-row">
                    <p className="chat-list-name">{chat.name}</p>
                  </div>
                  <div className="chat-list-row">
                    <p className={chat.unread > 0 ? 'chat-list-last' : 'chat-list-last read'}>{chat.message}</p>
                    <div className="chat-list-meta">{chat.unread > 0 && <span className="chat-list-badge">{chat.unread}</span>}</div>
                  </div>
                  <div className="chat-list-footer">
                    <span className={chat.unread > 0 ? 'chat-list-time unread' : 'chat-list-time'}>{chat.time}</span>
                  </div>
                </div>
                <div className="chat-list-menu-wrap">
                  <button
                    type="button"
                    className="chat-list-menu-trigger"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpenId((prev) => (prev === chat.id ? null : chat.id));
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuOpenId === chat.id && (
                    <div className="chat-list-menu">
                      <button type="button" onClick={() => archiveConversation(chat.id)}>
                        Arquivar
                      </button>
                      <button type="button" onClick={() => deleteConversation(chat.id)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {!filteredConversations.length && <p className="chat-list-empty">Nenhuma conversa encontrada.</p>}
          </div>
        </>
      )}

      {activeChat && (
        <div className="chat-thread">
          <header className="chat-thread-head">
            <button type="button" className="chat-thread-back" onClick={() => setActiveChatId(null)} aria-label="Voltar para conversas">
              <ChevronLeft size={16} />
            </button>
            <img src={activeChat.avatar} alt={activeChat.name} className="chat-thread-avatar" width="34" height="34" />
            <div className="chat-thread-user">
              <p>{activeChat.name}</p>
              <small>@{activeChat.user}</small>
            </div>
            <button type="button" className="chat-thread-close" onClick={onToggle} aria-label="Fechar chat">
              <X size={15} />
            </button>
          </header>

          <div className="chat-thread-messages">
            {(messagesByChat[activeChat.id] || []).map((message) => (
              <div key={message.id} className={message.mine ? 'chat-bubble mine' : 'chat-bubble'}>
                <p>{message.text}</p>
                <div className="chat-bubble-foot">
                  <button
                    type="button"
                    className={message.reacted ? 'chat-reaction reacted' : 'chat-reaction'}
                    onClick={() => toggleReaction(message.id)}
                    aria-label="Reagir"
                  >
                    <span>❤</span>
                    {message.reactions > 0 && <small>{message.reactions}</small>}
                  </button>
                  <span>{message.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="chat-thread-input">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendMessage();
              }}
              placeholder="Digite uma mensagem"
            />
            <button type="button" onClick={sendMessage} aria-label="Enviar mensagem">
              <SendHorizontal size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
