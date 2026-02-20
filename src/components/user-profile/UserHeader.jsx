import { ArrowLeft, ChevronRight } from 'lucide-react';

export default function UserHeader({ onBack, onForward }) {
  return (
    <header className="user-profile-header">
      <button type="button" className="user-profile-header-icon" onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={18} />
      </button>
      <button type="button" className="user-profile-header-icon" onClick={onForward} aria-label="Avancar painel">
        <ChevronRight size={18} />
      </button>
    </header>
  );
}
