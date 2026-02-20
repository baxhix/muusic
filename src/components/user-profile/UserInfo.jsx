import { MessageCircle } from 'lucide-react';

export default function UserInfo({ user }) {
  return (
    <section className="user-profile-info">
      <img src={user.avatar} alt={user.name} className="user-profile-avatar" />
      <h2 className="user-profile-name">{user.name}</h2>
      <p className="user-profile-status" aria-label={user.online ? 'Usuario online' : 'Usuario offline'}>
        <span className={user.online ? 'user-profile-status-dot online' : 'user-profile-status-dot'} />
        <span>{user.online ? 'online' : 'offline'}</span>
      </p>
      <p className="user-profile-bio">{user.bio}</p>
      <button type="button" className="user-profile-chat-btn" aria-label={`Conversar com ${user.name}`} onClick={() => user.onChat?.()}>
        <MessageCircle size={16} />
        <span>{`Conversar com ${user.firstName}`}</span>
      </button>
    </section>
  );
}
