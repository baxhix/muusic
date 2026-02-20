export default function UserTabs({ tabs, activeTab, onTabChange }) {
  return (
    <nav className="user-profile-tabs" aria-label="Navegacao do perfil">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeTab === tab.key ? 'user-profile-tab active' : 'user-profile-tab'}
          onClick={() => onTabChange(tab.key)}
          aria-current={activeTab === tab.key ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
