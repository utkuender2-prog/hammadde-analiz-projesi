import { useState, type FormEvent } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { acceptInvitation, completePasswordReset } from './api'

export default function AccountLinkScreen({
  mode,
  token,
}: {
  mode: 'invite' | 'reset'
  token: string
}) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('Parolalar birbiriyle eşleşmiyor.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'invite') await acceptInvitation(token, password)
      else await completePasswordReset(token, password)
      setDone(true)
      window.history.replaceState({}, '', window.location.pathname)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand"><div className="login-logo"><img src="/reeder-logo.png" alt="Reeder" /></div><span>Tedarik Zekâsı</span></div>
        <div><span className="login-eyebrow">GÜVENLİ HESAP İŞLEMİ</span><h1>{mode === 'invite' ? 'Ekibe hoş geldiniz.' : 'Hesabınıza yeniden erişin.'}</h1><p>Parolanız yalnızca şifrelenmiş biçimde saklanır ve yöneticiler tarafından görüntülenemez.</p></div>
        <div className="security-note"><ShieldCheck /><div><strong>Tek kullanımlık bağlantı</strong><span>İşlem tamamlandığında bu bağlantı geçersiz olacaktır.</span></div></div>
      </section>
      <section className="login-form-section">
        {done ? (
          <div className="login-card account-done"><ShieldCheck className="done-icon" /><h2>İşlem tamamlandı</h2><p>Yeni parolanızla giriş yapabilirsiniz.</p><button onClick={() => window.location.assign('/')}>Giriş ekranına dön</button></div>
        ) : (
          <form className="login-card" onSubmit={submit}>
            <div className="login-lock"><KeyRound /></div>
            <h2>{mode === 'invite' ? 'Hesabınızı etkinleştirin' : 'Yeni parola belirleyin'}</h2>
            <p>En az 15 karakterden oluşan güçlü bir parola kullanın.</p>
            {error && <div className="login-error">{error}</div>}
            <label><span>Yeni parola</span><input type="password" minLength={15} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label><span>Yeni parola tekrar</span><input type="password" minLength={15} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            <button disabled={busy}>{busy ? 'Kaydediliyor...' : 'Parolayı kaydet'}</button>
          </form>
        )}
      </section>
    </main>
  )
}
