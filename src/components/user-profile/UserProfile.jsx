import { useMemo, useState } from 'react';
import UserHeader from './UserHeader';
import UserInfo from './UserInfo';
import UserTabs from './UserTabs';
import MusicList from './MusicList';

const TABS = [
  { key: 'history', label: 'Histórico Musical' },
  { key: 'communities', label: 'Comunidades' },
  { key: 'activity', label: 'Atividade' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'manage', label: 'Gerenciar' }
];

const DEFAULT_USER = {
  name: 'Marcelo De Mari',
  online: true,
  bio: 'Apaixonado(a) por Sertanejo',
  avatar: 'https://i.pravatar.cc/300?img=13'
};

const DEFAULT_HISTORY = [
  {
    id: 1,
    title: 'I Am Mine',
    artist: 'Pearl Jam',
    date: '13/02/2026',
    cover: 'https://picsum.photos/seed/i-am-mine-a/200/200'
  },
  {
    id: 2,
    title: 'I Am Mine',
    artist: 'Pearl Jam',
    date: '13/02/2026',
    cover: 'https://picsum.photos/seed/i-am-mine-b/200/200'
  },
  {
    id: 3,
    title: 'I Am Mine',
    artist: 'Pearl Jam',
    date: '13/02/2026',
    cover: 'https://picsum.photos/seed/i-am-mine-c/200/200'
  },
  {
    id: 4,
    title: 'I Am Mine',
    artist: 'Pearl Jam',
    date: '13/02/2026',
    cover: 'https://picsum.photos/seed/i-am-mine-d/200/200'
  },
  {
    id: 5,
    title: 'Of the Girl - Live',
    artist: 'Pearl Jam',
    date: '13/02/2026',
    cover: 'https://picsum.photos/seed/of-the-girl-a/200/200'
  },
  {
    id: 6,
    title: 'Of the Girl - Live',
    artist: 'Pearl Jam',
    date: '13/02/2026',
    cover: 'https://picsum.photos/seed/of-the-girl-b/200/200'
  }
];

function toHistoryFromRecentTracks(recentTracks = []) {
  if (!Array.isArray(recentTracks) || recentTracks.length === 0) return DEFAULT_HISTORY;
  return recentTracks.map((track, index) => ({
    id: index + 1,
    title: track || 'Faixa desconhecida',
    artist: 'Artista nao informado',
    date: '13/02/2026',
    cover: `https://picsum.photos/seed/user-history-${index + 1}/200/200`
  }));
}

export default function UserProfile({ profile, onBack, onForward }) {
  const [activeTab, setActiveTab] = useState('history');

  const user = useMemo(() => {
    const name = profile?.name || DEFAULT_USER.name;
    const firstName = (name || DEFAULT_USER.name).trim().split(' ')[0] || 'Usuario';
    return {
      name,
      firstName,
      online: profile?.online !== false,
      bio: profile?.bio || DEFAULT_USER.bio,
      avatar: profile?.avatar || DEFAULT_USER.avatar
    };
  }, [profile]);

  const history = useMemo(() => {
    if (Array.isArray(profile?.musicHistory) && profile.musicHistory.length > 0) return profile.musicHistory;
    return toHistoryFromRecentTracks(profile?.recentTracks);
  }, [profile]);

  return (
    <article className="user-profile-page">
      <UserHeader onBack={onBack} onForward={onForward} />
      <div className="user-profile-content">
        <UserInfo user={user} />
        <UserTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'history' && <MusicList tracks={history} />}
        {activeTab !== 'history' && <div className="user-tab-placeholder">Conteúdo de {TABS.find((tab) => tab.key === activeTab)?.label || 'aba'} (mockado)</div>}
      </div>
    </article>
  );
}
