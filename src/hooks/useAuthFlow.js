import { useEffect, useState } from 'react';
import { API_URL } from '../config/appConfig';
import { readSessionUser, STORAGE_SESSION_KEY } from '../lib/storage';

export function useAuthFlow() {
  const initialSession = readSessionUser();
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [authUser, setAuthUser] = useState(initialSession);
  const [authBooting, setAuthBooting] = useState(Boolean(initialSession?.token));

  useEffect(() => {
    if (!initialSession?.token) {
      setAuthBooting(false);
      return;
    }
    if (initialSession.token === 'guest-local') {
      setAuthUser(initialSession);
      setAuthBooting(false);
      return;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/local/me`, {
          headers: {
            Authorization: `Bearer ${initialSession.token}`
          }
        });
        if (!response.ok) {
          if (!cancelled) {
            localStorage.removeItem(STORAGE_SESSION_KEY);
            setAuthUser(null);
          }
          return;
        }
        const payload = await response.json();
        if (!cancelled) {
          const session = { ...payload.user, token: initialSession.token };
          setAuthUser(session);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_SESSION_KEY);
          setAuthUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthBooting(false);
        }
      }
    };

    validateSession();
    return () => {
      cancelled = true;
    };
  }, [initialSession?.token]);

  function updateAuthField(field, value) {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  }

  function openForgotMode() {
    setForgotMode(true);
    setAuthError('');
    setForgotMessage('');
  }

  function closeForgotMode() {
    setForgotMode(false);
    setAuthError('');
    setForgotMessage('');
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError('');
    setForgotMessage('');
    const name = authForm.name.trim();
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;
    const confirmPassword = authForm.confirmPassword;

    if (!email || !password || (authMode === 'register' && !name)) {
      setAuthError('Preencha os campos obrigatorios.');
      return;
    }

    if (authMode === 'register') {
      if (password.length < 6) {
        setAuthError('Senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('A confirmacao de senha nao confere.');
        return;
      }
      try {
        const response = await fetch(`${API_URL}/auth/local/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, confirmPassword })
        });
        const payload = await response.json();
        if (!response.ok) {
          setAuthError(payload.error || 'Falha ao criar conta.');
          return;
        }
        const session = { ...payload.user, token: payload.token };
        setAuthUser(session);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
        setAuthForm({ name: '', email: '', password: '', confirmPassword: '' });
        return;
      } catch {
        setAuthError('Nao foi possivel conectar ao servidor.');
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/auth/local/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();
      if (!response.ok) {
        setAuthError(payload.error || 'Credenciais invalidas.');
        return;
      }
      const session = { ...payload.user, token: payload.token };
      setAuthUser(session);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      setAuthForm({ name: '', email: '', password: '', confirmPassword: '' });
    } catch {
      setAuthError('Nao foi possivel conectar ao servidor.');
    }
  }

  async function submitForgotPassword(event) {
    event.preventDefault();
    setAuthError('');
    setForgotMessage('');
    const email = authForm.email.trim().toLowerCase();
    if (!email) {
      setAuthError('Informe seu e-mail para recuperar a senha.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/local/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const payload = await response.json();
      if (!response.ok) {
        setAuthError(payload.error || 'Nao foi possivel recuperar senha.');
        return;
      }
      setForgotMessage(payload.message || 'Link de recuperacao enviado.');
    } catch {
      setAuthError('Nao foi possivel conectar ao servidor.');
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setAuthUser(null);
    setAuthBooting(false);
  }

  function quickEnter() {
    const session = {
      id: `guest-${Date.now()}`,
      name: 'Convidado',
      email: '',
      token: 'guest-local'
    };
    setAuthUser(session);
    setAuthBooting(false);
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage errors and keep in-memory session.
    }
  }

  return {
    authMode,
    setAuthMode,
    authForm,
    authError,
    forgotMode,
    forgotMessage,
    authBooting,
    authUser,
    setAuthUser,
    updateAuthField,
    submitAuth,
    submitForgotPassword,
    openForgotMode,
    closeForgotMode,
    quickEnter,
    logout
  };
}
