import { useEffect, useMemo, useState } from 'react';
import { Instagram } from 'lucide-react';
import muusicLogo from '../assets/logo-muusic.png';

const LANDING_TYPED_PHRASES = [
  ['A mesma música.', 'O mesmo sentimento.', 'Em tempo real.'],
  ['A música.', 'O Mundo.', 'Em tempo real.']
];

export default function AuthPage({
  simpleAccess,
  authMode,
  setAuthMode,
  authForm,
  authError,
  forgotMode,
  resetMode,
  forgotMessage,
  updateAuthField,
  submitAuth,
  submitForgotPassword,
  submitResetPassword,
  openForgotMode,
  closeForgotMode
}) {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState('idle');
  const [typedPhraseIndex, setTypedPhraseIndex] = useState(0);
  const [typedLineIndex, setTypedLineIndex] = useState(0);
  const [typedCharCount, setTypedCharCount] = useState(0);
  const [isDeletingTitle, setIsDeletingTitle] = useState(false);
  const landingDots = useMemo(
    () =>
      Array.from({ length: 160 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5.5}s`,
        duration: `${3.6 + Math.random() * 3.6}s`,
        opacity: 0.18 + Math.random() * 0.45
      })),
    []
  );
  const successBursts = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        angle: `${index * 20}deg`,
        delay: `${(index % 6) * 0.08}s`,
        distance: `${68 + (index % 4) * 16}px`
      })),
    []
  );
  const successConfetti = useMemo(
    () =>
      Array.from({ length: 32 }, (_, index) => ({
        id: index,
        left: `${4 + ((index * 9.2) % 92)}%`,
        delay: `${(index % 8) * 0.18}s`,
        duration: `${4.6 + (index % 5) * 0.45}s`,
        rotate: `${(index % 2 === 0 ? 1 : -1) * (16 + (index % 7) * 8)}deg`,
        colorClass: `is-tone-${(index % 4) + 1}`
      })),
    []
  );
  const activeTypedPhrase = LANDING_TYPED_PHRASES[typedPhraseIndex];
  const activeTypedLine = activeTypedPhrase[typedLineIndex] || '';
  const typedTitleLines = activeTypedPhrase.map((line, index) => {
    if (index < typedLineIndex) return line;
    if (index > typedLineIndex) return '';
    return line.slice(0, typedCharCount);
  });

  useEffect(() => {
    const typingDelay = isDeletingTitle ? 42 : 82;
    const pauseBeforeNextLineMs = 360;
    const pauseBeforeDeleteMs = 4000;
    const pauseBeforeNextPhraseMs = 520;

    const timerId = window.setTimeout(() => {
      if (!isDeletingTitle) {
        if (typedCharCount < activeTypedLine.length) {
          setTypedCharCount((prev) => prev + 1);
          return;
        }

        if (typedLineIndex < activeTypedPhrase.length - 1) {
          setTypedLineIndex((prev) => prev + 1);
          setTypedCharCount(0);
          return;
        }

        setIsDeletingTitle(true);
        return;
      }

      if (typedCharCount > 0) {
        setTypedCharCount((prev) => prev - 1);
        return;
      }

      if (typedLineIndex > 0) {
        const nextLineIndex = typedLineIndex - 1;
        setTypedLineIndex(nextLineIndex);
        setTypedCharCount(activeTypedPhrase[nextLineIndex]?.length || 0);
        return;
      }

      setIsDeletingTitle(false);
      setTypedPhraseIndex((prev) => (prev + 1) % LANDING_TYPED_PHRASES.length);
      setTypedCharCount(0);
    }, !isDeletingTitle && typedCharCount === activeTypedLine.length
      ? typedLineIndex === activeTypedPhrase.length - 1
        ? pauseBeforeDeleteMs
        : pauseBeforeNextLineMs
      : isDeletingTitle && typedCharCount === 0 && typedLineIndex === 0
        ? pauseBeforeNextPhraseMs
        : typingDelay);

    return () => window.clearTimeout(timerId);
  }, [activeTypedLine, activeTypedPhrase, isDeletingTitle, typedCharCount, typedLineIndex]);

  const submitWaitlist = (event) => {
    event.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setWaitlistStatus('error');
      setWaitlistMessage('Informe um e-mail valido.');
      return;
    }
    const key = 'muusic_waitlist_emails';
    const currentList = JSON.parse(localStorage.getItem(key) || '[]');
    if (!currentList.includes(email)) {
      currentList.push(email);
      localStorage.setItem(key, JSON.stringify(currentList));
    }
    setWaitlistStatus('success');
    setWaitlistMessage('Cadastro confirmado. Voce vai receber novidades da plataforma em breve.');
    setWaitlistEmail('');
  };

  const authFormCard = (
    <form className="auth-modern-card" onSubmit={forgotMode ? (resetMode ? submitResetPassword : submitForgotPassword) : submitAuth}>
      <h2>{forgotMode ? 'Recuperar senha' : authMode === 'login' ? 'Entrar na conta' : 'Criar conta'}</h2>
      <p>{forgotMode ? (resetMode ? 'Informe o token de recuperacao e sua nova senha.' : 'Informe seu e-mail para receber o link de recuperacao.') : 'Acesse para entrar na rede social geolocalizada.'}</p>

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

      {!forgotMode || !resetMode ? (
        <label>
          E-mail
          <input type="email" value={authForm.email} onChange={(event) => updateAuthField('email', event.target.value)} placeholder="voce@email.com" />
        </label>
      ) : null}

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

      {forgotMode && resetMode && (
        <>
          <label>
            Token de recuperacao
            <input
              value={authForm.resetToken}
              onChange={(event) => updateAuthField('resetToken', event.target.value)}
              placeholder="Cole o token recebido"
            />
          </label>
          <label>
            Nova senha
            <input
              type="password"
              value={authForm.resetPassword}
              onChange={(event) => updateAuthField('resetPassword', event.target.value)}
              placeholder="Minimo 6 caracteres"
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              type="password"
              value={authForm.resetConfirmPassword}
              onChange={(event) => updateAuthField('resetConfirmPassword', event.target.value)}
              placeholder="Repita a nova senha"
            />
          </label>
        </>
      )}

      {authError && <p className="auth-error">{authError}</p>}
      {forgotMessage && <p className="auth-ok">{forgotMessage}</p>}

      <button type="submit" className="auth-primary-btn">
        {forgotMode ? (resetMode ? 'Redefinir senha' : 'Enviar recuperacao') : authMode === 'login' ? 'Entrar' : 'Cadastrar'}
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
  );

  const waitlistSuccessView = (
    <main className="landing-main landing-main-success">
      <div className="landing-shell landing-success-shell">
        <div className="landing-success-stage" role="status" aria-live="polite">
          <div className="landing-success-confetti" aria-hidden="true">
            {successConfetti.map((piece) => (
              <span
                key={piece.id}
                className={`landing-success-confetti-piece ${piece.colorClass}`}
                style={{
                  left: piece.left,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                  '--confetti-rotate': piece.rotate
                }}
              />
            ))}
          </div>

          <div className="landing-success-burst" aria-hidden="true">
            {successBursts.map((piece) => (
              <span
                key={piece.id}
                className="landing-success-burst-piece"
                style={{
                  '--burst-angle': piece.angle,
                  '--burst-delay': piece.delay,
                  '--burst-distance': piece.distance
                }}
              />
            ))}
          </div>

          <div className="landing-success-core" aria-hidden="true">
            <span className="landing-success-ring landing-success-ring-outer" />
            <span className="landing-success-ring landing-success-ring-inner" />
            <span className="landing-success-check">✓</span>
          </div>

          <div className="landing-success-copy">
            <p className="landing-success-kicker">Cadastro confirmado</p>
            <h1>Você entrou para a plataforma.</h1>
            <p>{waitlistMessage}</p>
          </div>

          <button
            type="button"
            className="landing-success-reset"
            onClick={() => {
              setWaitlistStatus('idle');
              setWaitlistMessage('');
            }}
          >
            Cadastrar outro e-mail
          </button>
        </div>
      </div>
    </main>
  );

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
            <div className="landing-brand" aria-label="Muusic">
              <img src={muusicLogo} alt="Muusic" className="landing-logo" />
            </div>
          </div>
        </header>

        {waitlistStatus === 'success' ? waitlistSuccessView : (
        <main className="landing-main">
          <div className="landing-shell landing-main-inner">
            <h1 className="landing-title">
              {typedTitleLines.map((line, index) => {
                const isActiveLine = typedLineIndex === index;
                const isMutedLine = index === 2;
                return (
                  <span
                    key={`${typedPhraseIndex}-${index}`}
                    className={`landing-title-line${isMutedLine ? ' is-muted' : ''}${isActiveLine ? ' has-caret' : ''}`}
                  >
                    {line || '\u00A0'}
                  </span>
                );
              })}
            </h1>

            <p className="landing-subtitle">Descubra o que o mundo está ouvindo, em tempo real.</p>
            <p className="landing-subtitle landing-subtitle-secondary">Deixe seu e-mail e entre para a lista de acesso antecipado do muusic.</p>

            <form className="landing-waitlist" onSubmit={submitWaitlist}>
              <input
                type="email"
                value={waitlistEmail}
                onChange={(event) => {
                  setWaitlistEmail(event.target.value);
                  if (waitlistStatus !== 'idle') {
                    setWaitlistStatus('idle');
                    setWaitlistMessage('');
                  }
                }}
                placeholder="seu@email.com"
                aria-label="Cadastrar e-mail na lista de espera"
              />
              <button type="submit">Entrar na lista</button>
            </form>
            {waitlistStatus === 'success' ? (
              <div className="landing-waitlist-celebration" role="status" aria-live="polite">
                <div className="landing-waitlist-burst" aria-hidden="true">
                  {successBursts.map((piece) => (
                    <span
                      key={piece.id}
                      className="landing-waitlist-burst-piece"
                      style={{
                        '--burst-angle': piece.angle,
                        '--burst-delay': piece.delay,
                        '--burst-distance': piece.distance
                      }}
                    />
                  ))}
                </div>
                <div className="landing-waitlist-celebration-core" aria-hidden="true">
                  <span className="landing-waitlist-celebration-ring" />
                  <span className="landing-waitlist-celebration-check">✓</span>
                </div>
                <div className="landing-waitlist-celebration-copy">
                  <strong>Voce entrou para a plataforma.</strong>
                  <p>{waitlistMessage}</p>
                </div>
              </div>
            ) : waitlistMessage ? (
              <p className="landing-waitlist-msg">{waitlistMessage}</p>
            ) : null}
          </div>
        </main>
        )}

        {waitlistStatus !== 'success' ? (
          <>
            <section id="login" className="landing-auth-section">
              <div className="landing-shell landing-auth-inner">{authFormCard}</div>
            </section>

            <footer className="landing-footer">
              <div className="landing-shell landing-footer-inner">
                <div className="landing-footer-left">
                  <button type="button">
                    Blog
                  </button>
                </div>
                <p className="landing-footer-center">© 2026 Muusic. Todos os direitos reservados.</p>
                <div className="landing-footer-right">
                  <button type="button" aria-label="Instagram">
                    <Instagram size={16} />
                  </button>
                  <button type="button" aria-label="Spotify">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M12 1.6a10.4 10.4 0 1 0 10.4 10.4A10.41 10.41 0 0 0 12 1.6Zm4.77 14.95a.65.65 0 0 1-.9.22 9.87 9.87 0 0 0-8.15-.87.65.65 0 1 1-.39-1.24 11.16 11.16 0 0 1 9.27.98.65.65 0 0 1 .17.91Zm1.27-2.8a.8.8 0 0 1-1.09.27 12.18 12.18 0 0 0-10.09-1.05.8.8 0 1 1-.49-1.52 13.77 13.77 0 0 1 11.43 1.2.8.8 0 0 1 .24 1.1Zm.1-2.94A14.54 14.54 0 0 0 6.32 9.6a.95.95 0 1 1-.57-1.81 16.44 16.44 0 0 1 13.37 1.35.95.95 0 1 1-.98 1.67Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : null}
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
        <p>A rede social geolocalizada da música ao vivo.</p>
      </section>

      <section className="auth-panel">
        {authFormCard}
      </section>
    </div>
  );
}
