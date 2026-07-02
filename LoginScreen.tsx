import { useState, type FormEvent } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { login } from './api'
import type { CurrentUser } from './types'

export default function LoginScreen({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await login(username, password))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Giriş yapılamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand"><div className="login-logo"><img src="/reeder-logo.png" alt="Reeder" /></div><span>Tedarik Zekâsı</span></div>
        <div>
          <span className="login-eyebrow">TEDARİK KARAR DESTEK SİSTEMİ</span>
          <h1>Veriye dayalı satın alma kararları.</h1>
          <p>Hammadde fiyatlarını, stok risklerini ve tedarik önerilerini güvenli yerel ortamda yönetin.</p>
        </div>
        <div className="security-note"><ShieldCheck /><div><strong>Yerel veri güvenliği</strong><span>Veriler bu bilgisayardaki SQLite veritabanında saklanır.</span></div></div>
      </section>
      <section className="login-form-section">
        <form className="login-card" onSubmit={submit}>
          <div className="login-lock"><LockKeyhole /></div>
          <h2>Oturum aç</h2>
          <p>Devam etmek için kullanıcı bilgilerinizi girin.</p>
          {error && <div className="login-error">{error}</div>}
          <label><span>Kullanıcı adı</span><input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label><span>Parola</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button disabled={busy}>{busy ? 'Kontrol ediliyor...' : 'Güvenli giriş'}</button>
          <small>Oturum 60 dakika sonra otomatik olarak sona erer.</small>
        </form>
      </section>
    </main>
  )
}
