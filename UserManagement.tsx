import { useEffect, useState, type FormEvent } from 'react'
import {
  Ban,
  CheckCircle2,
  Clipboard,
  KeyRound,
  Link2,
  RefreshCw,
  Shield,
  UserPlus,
} from 'lucide-react'
import {
  createInvitation,
  createPasswordResetLink,
  getAuditLogs,
  getUsers,
  revokeInvitation,
  revokeUserSessions,
  updateUser,
} from './api'
import type { AccountLink, AdminUser, AuditLog, UserRole } from './types'

const roleLabels: Record<UserRole, string> = {
  viewer: 'Görüntüleyici',
  editor: 'Editör',
  admin: 'Admin',
}

export default function UserManagement({ currentUsername }: { currentUsername: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<UserRole>('viewer')
  const [expiresHours, setExpiresHours] = useState(24)
  const [generatedLink, setGeneratedLink] = useState<AccountLink | null>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const [userRows, auditRows] = await Promise.all([getUsers(), getAuditLogs()])
    setUsers(userRows)
    setLogs(auditRows)
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message))
  }, [])

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      await load()
      setMessage(success)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  async function submitInvitation(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await createInvitation(username, role, expiresHours)
      setGeneratedLink(result)
      setLinkTitle(`${username} için davet bağlantısı`)
      setUsername('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Davet oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  async function makeResetLink(user: AdminUser) {
    setBusy(true)
    setError('')
    try {
      const result = await createPasswordResetLink(user.username)
      setGeneratedLink(result)
      setLinkTitle(`${user.username} için parola sıfırlama bağlantısı`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Bağlantı oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  const fullLink = generatedLink
    ? `${window.location.origin}${generatedLink.path}`
    : ''

  return (
    <section className="management user-management">
      <div className="management-header">
        <div>
          <p className="eyebrow">ERİŞİM YÖNETİMİ</p>
          <h1>Kullanıcı Yönetimi</h1>
          <p>Davetleri, rolleri, hesap durumlarını ve güvenlik işlemlerini yönetin.</p>
        </div>
        <button className="secondary-button" onClick={() => load()} disabled={busy}>
          <RefreshCw size={17} /> Yenile
        </button>
      </div>

      {message && <div className="success-state">{message}</div>}
      {error && <div className="error-state">{error}</div>}

      <div className="user-admin-grid">
        <form className="panel invite-panel" onSubmit={submitInvitation}>
          <div className="panel-heading">
            <div><span>YENİ HESAP</span><h2>Davet bağlantısı oluştur</h2></div>
            <UserPlus />
          </div>
          <label className="form-field">
            <span>Kullanıcı adı</span>
            <input required minLength={3} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ornek.kullanici" />
          </label>
          <label className="form-field">
            <span>Başlangıç rolü</span>
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Geçerlilik</span>
            <select value={expiresHours} onChange={(event) => setExpiresHours(Number(event.target.value))}>
              <option value={1}>1 saat</option>
              <option value={24}>24 saat</option>
              <option value={72}>3 gün</option>
              <option value={168}>7 gün</option>
            </select>
          </label>
          <button className="primary-button invite-submit" disabled={busy}><Link2 size={17} /> Davet oluştur</button>
        </form>

        <article className="panel security-rules">
          <div className="panel-heading">
            <div><span>GÜVENLİK</span><h2>Hesap kuralları</h2></div>
            <Shield />
          </div>
          <ul>
            <li>Parolayı kullanıcı kendisi belirler.</li>
            <li>Bağlantılar tek kullanımlık ve sürelidir.</li>
            <li>Rol veya parola değişince eski oturumlar kapanır.</li>
            <li>Son aktif admin hesabı kapatılamaz.</li>
            <li>Tüm yönetim işlemleri denetim kaydına yazılır.</li>
          </ul>
        </article>
      </div>

      {generatedLink && (
        <div className="generated-link">
          <div>
            <strong>{linkTitle}</strong>
            <span>{fullLink}</span>
            <small>Son kullanım: {new Date(generatedLink.expires_at).toLocaleString('tr-TR')}</small>
          </div>
          <button className="primary-button" onClick={() => navigator.clipboard.writeText(fullLink)}><Clipboard size={16} /> Kopyala</button>
          {generatedLink.path.includes('invite') && (
            <button className="secondary-button" onClick={() => run(() => revokeInvitation(generatedLink.token), 'Davet iptal edildi.').then(() => setGeneratedLink(null))}><Ban size={16} /> İptal et</button>
          )}
        </div>
      )}

      <div className="management-table-wrap user-table-wrap">
        <table className="management-table user-table">
          <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>Son giriş</th><th>Güvenlik işlemleri</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.username}>
                <td><strong>{user.username}</strong><small>{user.username === currentUsername ? 'Mevcut hesabınız' : `Oluşturma: ${user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}`}</small></td>
                <td>
                  <select
                    className="role-select"
                    value={user.role}
                    disabled={busy || user.username === currentUsername}
                    onChange={(event) => run(
                      () => updateUser(user.username, { role: event.target.value as UserRole }),
                      `${user.username} rolü güncellendi.`,
                    )}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
                <td><span className={`account-status ${user.is_active ? 'active' : 'inactive'}`}>{user.is_active ? <CheckCircle2 size={13} /> : <Ban size={13} />}{user.is_active ? 'Aktif' : 'Kapalı'}</span></td>
                <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString('tr-TR') : 'Henüz giriş yapmadı'}</td>
                <td>
                  <div className="user-actions">
                    <button className="secondary-button" disabled={busy || user.username === currentUsername} onClick={() => run(() => updateUser(user.username, { is_active: !user.is_active }), user.is_active ? 'Hesap kapatıldı.' : 'Hesap açıldı.')}>{user.is_active ? <Ban size={15} /> : <CheckCircle2 size={15} />}{user.is_active ? 'Kapat' : 'Aç'}</button>
                    <button className="secondary-button" disabled={busy || !user.is_active} onClick={() => makeResetLink(user)}><KeyRound size={15} /> Şifre linki</button>
                    <button className="secondary-button" disabled={busy || user.username === currentUsername} onClick={() => run(() => revokeUserSessions(user.username), 'Kullanıcının oturumları kapatıldı.')}><Shield size={15} /> Oturumları kapat</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="audit-section">
        <div className="management-header compact"><div><p className="eyebrow">DENETİM KAYITLARI</p><h2>Son güvenlik işlemleri</h2></div></div>
        <div className="audit-list">
          {logs.slice(0, 20).map((log) => (
            <article key={log.id}>
              <div><strong>{log.action}</strong><span>{log.actor} → {log.target}</span></div>
              <p>{log.details || 'Ek ayrıntı yok'}</p>
              <time>{new Date(log.created_at).toLocaleString('tr-TR')}</time>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
