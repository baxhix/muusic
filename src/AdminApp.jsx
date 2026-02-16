import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthPage from './components/AuthPage';
import { API_URL } from './config/appConfig';
import { useAuthFlow } from './hooks/useAuthFlow';
import './styles/admin.css';

const EMPTY_NEW_USER = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'USER'
};

const EMPTY_NEW_SHOW = {
  artist: '',
  venue: '',
  city: '',
  country: 'Brasil',
  startsAt: '',
  latitude: '',
  longitude: '',
  thumbUrl: '',
  ticketUrl: ''
};

function normalizeRole(role) {
  return role === 'ADMIN' ? 'ADMIN' : 'USER';
}

function toDatetimeLocalValue(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDatetimeLocal(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function mapShowToDraft(show) {
  return {
    artist: show.artist || '',
    venue: show.venue || '',
    city: show.city || '',
    country: show.country || 'Brasil',
    startsAt: toDatetimeLocalValue(show.startsAt),
    latitude: String(show.latitude ?? ''),
    longitude: String(show.longitude ?? ''),
    thumbUrl: show.thumbUrl || '',
    ticketUrl: show.ticketUrl || ''
  };
}

export default function AdminApp() {
  const {
    authMode,
    setAuthMode,
    authForm,
    authError,
    authBooting,
    authUser,
    updateAuthField,
    submitAuth,
    submitForgotPassword,
    submitResetPassword,
    forgotMode,
    resetMode,
    forgotMessage,
    openForgotMode,
    closeForgotMode,
    logout
  } = useAuthFlow();

  const [users, setUsers] = useState([]);
  const [shows, setShows] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingShows, setLoadingShows] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [newShow, setNewShow] = useState(EMPTY_NEW_SHOW);
  const [editingUserById, setEditingUserById] = useState({});
  const [editingShowById, setEditingShowById] = useState({});
  const [savingUserById, setSavingUserById] = useState({});
  const [savingShowById, setSavingShowById] = useState({});

  const isAdmin = useMemo(() => authUser?.role === 'ADMIN', [authUser?.role]);

  const adminFetch = useCallback(
    async (path, options = {}) => {
      if (!authUser?.token) {
        throw new Error('Sessao administrativa ausente.');
      }

      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${authUser.token}`,
        'x-session-id': authUser.sessionId || ''
      };

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        cache: 'no-store',
        headers
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Falha na requisicao administrativa.');
      }
      return payload;
    },
    [authUser?.token, authUser?.sessionId]
  );

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const payload = await adminFetch('/admin/users?page=1&limit=200');
      const list = Array.isArray(payload.users) ? payload.users : [];
      setUsers(list);
      setEditingUserById(
        Object.fromEntries(
          list.map((user) => [
            user.id,
            {
              name: user.name || '',
              email: user.email || '',
              role: normalizeRole(user.role),
              password: ''
            }
          ])
        )
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [adminFetch, isAdmin]);

  const loadShows = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingShows(true);
    try {
      const payload = await adminFetch('/admin/shows?page=1&limit=200');
      const list = Array.isArray(payload.shows) ? payload.shows : [];
      setShows(list);
      setEditingShowById(Object.fromEntries(list.map((show) => [show.id, mapShowToDraft(show)])));
    } finally {
      setLoadingShows(false);
    }
  }, [adminFetch, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setAdminError('');
    loadUsers().catch((error) => setAdminError(error.message));
    loadShows().catch((error) => setAdminError(error.message));
  }, [isAdmin, loadShows, loadUsers]);

  function handleNewUserField(field, value) {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  }

  function handleNewShowField(field, value) {
    setNewShow((prev) => ({ ...prev, [field]: value }));
  }

  function handleEditingUserField(userId, field, value) {
    setEditingUserById((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { name: '', email: '', role: 'USER', password: '' }),
        [field]: value
      }
    }));
  }

  function handleEditingShowField(showId, field, value) {
    setEditingShowById((prev) => ({
      ...prev,
      [showId]: {
        ...(prev[showId] || EMPTY_NEW_SHOW),
        [field]: value
      }
    }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    const name = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    const password = newUser.password;
    const confirmPassword = newUser.confirmPassword;

    if (!name || !email || !password || !confirmPassword) {
      setAdminError('Preencha todos os campos para criar o usuario.');
      return;
    }
    if (password !== confirmPassword) {
      setAdminError('A confirmacao de senha nao confere.');
      return;
    }

    try {
      await adminFetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: normalizeRole(newUser.role)
        })
      });
      setNewUser(EMPTY_NEW_USER);
      setAdminSuccess('Usuario criado com sucesso.');
      await loadUsers();
    } catch (error) {
      setAdminError(error.message);
    }
  }

  async function handleSaveUser(userId) {
    setSavingUserById((prev) => ({ ...prev, [userId]: true }));
    setAdminError('');
    setAdminSuccess('');

    const draft = editingUserById[userId];
    if (!draft) {
      setSavingUserById((prev) => ({ ...prev, [userId]: false }));
      return;
    }

    try {
      await adminFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          role: normalizeRole(draft.role),
          password: draft.password || undefined
        })
      });
      setAdminSuccess('Usuario atualizado com sucesso.');
      await loadUsers();
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setSavingUserById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function handleDeleteUser(userId, userName) {
    setAdminError('');
    setAdminSuccess('');
    const confirmed = window.confirm(`Excluir usuario ${userName}? Esta acao nao pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await adminFetch(`/admin/users/${userId}`, {
        method: 'DELETE'
      });
      setAdminSuccess('Usuario removido com sucesso.');
      await loadUsers();
    } catch (error) {
      setAdminError(error.message);
    }
  }

  async function handleCreateShow(event) {
    event.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    const startsAt = parseDatetimeLocal(newShow.startsAt);
    if (!startsAt) {
      setAdminError('Data/hora do show invalida.');
      return;
    }

    try {
      await adminFetch('/admin/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: newShow.artist,
          venue: newShow.venue,
          city: newShow.city,
          country: newShow.country,
          startsAt,
          latitude: Number(newShow.latitude),
          longitude: Number(newShow.longitude),
          thumbUrl: newShow.thumbUrl,
          ticketUrl: newShow.ticketUrl
        })
      });
      setNewShow(EMPTY_NEW_SHOW);
      setAdminSuccess('Show criado com sucesso.');
      await loadShows();
    } catch (error) {
      setAdminError(error.message);
    }
  }

  async function handleSaveShow(showId) {
    setSavingShowById((prev) => ({ ...prev, [showId]: true }));
    setAdminError('');
    setAdminSuccess('');

    const draft = editingShowById[showId];
    if (!draft) {
      setSavingShowById((prev) => ({ ...prev, [showId]: false }));
      return;
    }

    const startsAt = parseDatetimeLocal(draft.startsAt);
    if (!startsAt) {
      setAdminError('Data/hora do show invalida.');
      setSavingShowById((prev) => ({ ...prev, [showId]: false }));
      return;
    }

    try {
      await adminFetch(`/admin/shows/${showId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: draft.artist,
          venue: draft.venue,
          city: draft.city,
          country: draft.country,
          startsAt,
          latitude: Number(draft.latitude),
          longitude: Number(draft.longitude),
          thumbUrl: draft.thumbUrl,
          ticketUrl: draft.ticketUrl
        })
      });
      setAdminSuccess('Show atualizado com sucesso.');
      await loadShows();
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setSavingShowById((prev) => ({ ...prev, [showId]: false }));
    }
  }

  async function handleDeleteShow(showId, showArtist) {
    setAdminError('');
    setAdminSuccess('');
    const confirmed = window.confirm(`Excluir show de ${showArtist}? Esta acao nao pode ser desfeita.`);
    if (!confirmed) return;

    try {
      await adminFetch(`/admin/shows/${showId}`, {
        method: 'DELETE'
      });
      setAdminSuccess('Show removido com sucesso.');
      await loadShows();
    } catch (error) {
      setAdminError(error.message);
    }
  }

  if (authBooting) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loading-pulse" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        authError={authError}
        forgotMode={forgotMode}
        resetMode={resetMode}
        forgotMessage={forgotMessage}
        updateAuthField={updateAuthField}
        submitAuth={submitAuth}
        submitForgotPassword={submitForgotPassword}
        submitResetPassword={submitResetPassword}
        openForgotMode={openForgotMode}
        closeForgotMode={closeForgotMode}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-shell admin-shell-small">
          <h1>Painel Muusic</h1>
          <p>Seu usuario nao possui permissao administrativa.</p>
          <button type="button" className="admin-btn" onClick={() => logout().catch(() => {})}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-tag">painel.muusic.live</p>
          <h1>Painel Administrativo Muusic</h1>
        </div>
        <div className="admin-header-actions">
          <p>{authUser.name}</p>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => logout().catch(() => {})}>
            Sair
          </button>
        </div>
      </header>

      <main className="admin-shell">
        <section className="admin-card">
          <h2>Criar usuario</h2>
          <form className="admin-grid" onSubmit={handleCreateUser}>
            <label>
              Nome
              <input value={newUser.name} onChange={(event) => handleNewUserField('name', event.target.value)} />
            </label>
            <label>
              E-mail
              <input type="email" value={newUser.email} onChange={(event) => handleNewUserField('email', event.target.value)} />
            </label>
            <label>
              Senha
              <input type="password" value={newUser.password} onChange={(event) => handleNewUserField('password', event.target.value)} />
            </label>
            <label>
              Confirmar senha
              <input
                type="password"
                value={newUser.confirmPassword}
                onChange={(event) => handleNewUserField('confirmPassword', event.target.value)}
              />
            </label>
            <label>
              Perfil
              <select value={newUser.role} onChange={(event) => handleNewUserField('role', normalizeRole(event.target.value))}>
                <option value="USER">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
            <div className="admin-actions-row">
              <button type="submit" className="admin-btn">
                Criar usuario
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Usuarios cadastrados</h2>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => loadUsers().catch((error) => setAdminError(error.message))}>
              Atualizar
            </button>
          </div>

          {adminError && <p className="admin-msg admin-msg-error">{adminError}</p>}
          {adminSuccess && <p className="admin-msg admin-msg-ok">{adminSuccess}</p>}

          {loadingUsers ? (
            <p>Carregando usuarios...</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Nova senha</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const draft = editingUserById[user.id] || {
                      name: user.name || '',
                      email: user.email || '',
                      role: normalizeRole(user.role),
                      password: ''
                    };

                    return (
                      <tr key={user.id}>
                        <td>
                          <input value={draft.name} onChange={(event) => handleEditingUserField(user.id, 'name', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.email} onChange={(event) => handleEditingUserField(user.id, 'email', event.target.value)} />
                        </td>
                        <td>
                          <select value={draft.role} onChange={(event) => handleEditingUserField(user.id, 'role', normalizeRole(event.target.value))}>
                            <option value="USER">Usuario</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="password"
                            value={draft.password}
                            onChange={(event) => handleEditingUserField(user.id, 'password', event.target.value)}
                            placeholder="Opcional"
                          />
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-small"
                              onClick={() => handleSaveUser(user.id)}
                              disabled={Boolean(savingUserById[user.id])}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-small admin-btn-danger"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhum usuario cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card">
          <h2>Criar show</h2>
          <form className="admin-grid" onSubmit={handleCreateShow}>
            <label>
              Artista
              <input value={newShow.artist} onChange={(event) => handleNewShowField('artist', event.target.value)} />
            </label>
            <label>
              Local
              <input value={newShow.venue} onChange={(event) => handleNewShowField('venue', event.target.value)} />
            </label>
            <label>
              Cidade
              <input value={newShow.city} onChange={(event) => handleNewShowField('city', event.target.value)} />
            </label>
            <label>
              Pais
              <input value={newShow.country} onChange={(event) => handleNewShowField('country', event.target.value)} />
            </label>
            <label>
              Data e hora
              <input type="datetime-local" value={newShow.startsAt} onChange={(event) => handleNewShowField('startsAt', event.target.value)} />
            </label>
            <label>
              Latitude
              <input value={newShow.latitude} onChange={(event) => handleNewShowField('latitude', event.target.value)} />
            </label>
            <label>
              Longitude
              <input value={newShow.longitude} onChange={(event) => handleNewShowField('longitude', event.target.value)} />
            </label>
            <label>
              Thumb URL
              <input value={newShow.thumbUrl} onChange={(event) => handleNewShowField('thumbUrl', event.target.value)} />
            </label>
            <label>
              URL ingressos
              <input value={newShow.ticketUrl} onChange={(event) => handleNewShowField('ticketUrl', event.target.value)} />
            </label>
            <div className="admin-actions-row">
              <button type="submit" className="admin-btn">
                Criar show
              </button>
            </div>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2>Shows cadastrados</h2>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => loadShows().catch((error) => setAdminError(error.message))}>
              Atualizar
            </button>
          </div>

          {loadingShows ? (
            <p>Carregando shows...</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Artista</th>
                    <th>Local</th>
                    <th>Cidade</th>
                    <th>Pais</th>
                    <th>Data</th>
                    <th>Lat</th>
                    <th>Lng</th>
                    <th>Thumb</th>
                    <th>Ingresso</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {shows.map((show) => {
                    const draft = editingShowById[show.id] || mapShowToDraft(show);
                    return (
                      <tr key={show.id}>
                        <td>
                          <input value={draft.artist} onChange={(event) => handleEditingShowField(show.id, 'artist', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.venue} onChange={(event) => handleEditingShowField(show.id, 'venue', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.city} onChange={(event) => handleEditingShowField(show.id, 'city', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.country} onChange={(event) => handleEditingShowField(show.id, 'country', event.target.value)} />
                        </td>
                        <td>
                          <input
                            type="datetime-local"
                            value={draft.startsAt}
                            onChange={(event) => handleEditingShowField(show.id, 'startsAt', event.target.value)}
                          />
                        </td>
                        <td>
                          <input value={draft.latitude} onChange={(event) => handleEditingShowField(show.id, 'latitude', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.longitude} onChange={(event) => handleEditingShowField(show.id, 'longitude', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.thumbUrl} onChange={(event) => handleEditingShowField(show.id, 'thumbUrl', event.target.value)} />
                        </td>
                        <td>
                          <input value={draft.ticketUrl} onChange={(event) => handleEditingShowField(show.id, 'ticketUrl', event.target.value)} />
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-small"
                              onClick={() => handleSaveShow(show.id)}
                              disabled={Boolean(savingShowById[show.id])}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-small admin-btn-danger"
                              onClick={() => handleDeleteShow(show.id, show.artist)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {shows.length === 0 && (
                    <tr>
                      <td colSpan={10}>Nenhum show cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
