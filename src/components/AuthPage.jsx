import { useMemo, useState } from 'react';
import { Instagram } from 'lucide-react';
import muusicLogo from '../assets/logo-muusic.png';

export default function AuthPage({
  simpleAccess,
  onQuickEnter,
  authMode,
  setAuthMode,
  authForm,
  authError,
  forgotMode,
  forgotMessage,
  updateAuthField,
  submitAuth,
  submitForgotPassword,
  openForgotMode,
  closeForgotMode
}) {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const landingDots = useMemo(
    () =>
      Array.from({ length: 180 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5.5}s`,
        duration: `${3.6 + Math.random() * 3.6}s`,
        opacity: 0.18 + Math.random() * 0.45
      })),
    []
  );

  const submitWaitlist = (event) => {
    event.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setWaitlistMessage('Informe um e-mail valido.');
      return;
    }
    const key = 'muusic_waitlist_emails';
    const currentList = JSON.parse(localStorage.getItem(key) || '[]');
    if (!currentList.includes(email)) {
      currentList.push(email);
      localStorage.setItem(key, JSON.stringify(currentList));
    }
    setWaitlistMessage('E-mail cadastrado na lista de acesso antecipado.');
    setWaitlistEmail('');
  };

  if (simpleAccess) {
    return (
      <div className="landing-page">
        <div className="landing-bg" />
        <div className="landing-dot-field" aria-hidden>
          {landingDots.map((dot) => (
            <span
              key={dot.id}
              className="landing-dot"
              style={{
                left: dot.left,
                top: dot.top,
                opacity: dot.opacity,
                animationDelay: dot.delay,
                animationDuration: dot.duration
              }}
            />
          ))}
        </div>

        <header className="landing-header">
          <div className="landing-shell landing-header-inner">
            <img
              src={muusicLogo}
              alt="Muusic"
              className="landing-logo"
            />
            <button type="button" className="landing-login-btn" onClick={onQuickEnter}>
              Login
            </button>
          </div>
        </header>

        <main className="landing-main">
          <div className="landing-shell landing-main-inner">
            <h1 className="landing-title">
              <span className="typed-line typed-line-1">A musica.</span>
              <span className="typed-line typed-line-2">O mundo.</span>
              <span className="typed-line typed-line-3">Em tempo real.</span>
            </h1>

            <p className="landing-subtitle">
              Descubra o que o mundo esta ouvindo, em tempo real.
              <br />
              Deixe seu e-mail e entre para a lista de acesso antecipado do muusic.
            </p>

            <form className="landing-waitlist" onSubmit={submitWaitlist}>
              <input
                type="email"
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                placeholder="Seu melhor e-mail"
                aria-label="Cadastrar e-mail na lista de espera"
              />
              <button type="submit">Entrar na lista</button>
            </form>
            {waitlistMessage && <p className="landing-waitlist-msg">{waitlistMessage}</p>}
          </div>
        </main>

        <footer className="landing-footer">
          <div className="landing-shell landing-footer-inner">
            <div className="landing-footer-left">
              <a href="#" onClick={(event) => event.preventDefault()}>
                Artists
              </a>
              <a href="#" onClick={(event) => event.preventDefault()}>
                Blog
              </a>
            </div>
            <p className="landing-footer-center">© 2025 Muusic. Todos os direitos reservados.</p>
            <div className="landing-footer-right">
              <a href="#" aria-label="Instagram" onClick={(event) => event.preventDefault()}>
                <Instagram size={16} />
              </a>
              <a href="#" aria-label="Spotify" onClick={(event) => event.preventDefault()}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M12 1.6a10.4 10.4 0 1 0 10.4 10.4A10.41 10.41 0 0 0 12 1.6Zm4.77 14.95a.65.65 0 0 1-.9.22 9.87 9.87 0 0 0-8.15-.87.65.65 0 1 1-.39-1.24 11.16 11.16 0 0 1 9.27.98.65.65 0 0 1 .17.91Zm1.27-2.8a.8.8 0 0 1-1.09.27 12.18 12.18 0 0 0-10.09-1.05.8.8 0 1 1-.49-1.52 13.77 13.77 0 0 1 11.43 1.2.8.8 0 0 1 .24 1.1Zm.1-2.94A14.54 14.54 0 0 0 6.32 9.6a.95.95 0 1 1-.57-1.81 16.44 16.44 0 0 1 13.37 1.35.95.95 0 1 1-.98 1.67Z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page-bg" />
      <section className="auth-hero">
        <div className="auth-brand-mark">
          <img
            src={muusicLogo}
            alt="Muusic"
          />
        </div>
        <h1>Muusic</h1>
        <p>A rede social geolocalizada da musica ao vivo.</p>
      </section>

      <section className="auth-panel">
        <form className="auth-modern-card" onSubmit={forgotMode ? submitForgotPassword : submitAuth}>
          <h2>{forgotMode ? 'Recuperar senha' : authMode === 'login' ? 'Entrar na conta' : 'Criar conta'}</h2>
          <p>{forgotMode ? 'Informe seu e-mail para receber o link de recuperacao.' : 'Acesse para entrar na rede social geolocalizada.'}</p>

          {!forgotMode && (
            <div className="auth-modern-switch">
              <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                Entrar
              </button>
              <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
                Criar conta
              </button>
            </div>
          )}

          {!forgotMode && authMode === 'register' && (
            <label>
              Nome completo
              <input value={authForm.name} onChange={(event) => updateAuthField('name', event.target.value)} placeholder="Seu nome" />
            </label>
          )}

          <label>
            E-mail
            <input type="email" value={authForm.email} onChange={(event) => updateAuthField('email', event.target.value)} placeholder="voce@email.com" />
          </label>

          {!forgotMode && (
            <>
              <label>
                Senha
                <input type="password" value={authForm.password} onChange={(event) => updateAuthField('password', event.target.value)} placeholder="Minimo 6 caracteres" />
              </label>

              {authMode === 'register' && (
                <label>
                  Confirmar senha
                  <input
                    type="password"
                    value={authForm.confirmPassword}
                    onChange={(event) => updateAuthField('confirmPassword', event.target.value)}
                    placeholder="Repita sua senha"
                  />
                </label>
              )}
            </>
          )}

          {authError && <p className="auth-error">{authError}</p>}
          {forgotMessage && <p className="auth-ok">{forgotMessage}</p>}

          <button type="submit" className="auth-primary-btn">
            {forgotMode ? 'Enviar recuperacao' : authMode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>

          <div className="auth-bottom-links">
            {!forgotMode && (
              <button type="button" onClick={openForgotMode}>
                Esqueci a senha
              </button>
            )}
            {forgotMode && (
              <button type="button" onClick={closeForgotMode}>
                Voltar para login
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
