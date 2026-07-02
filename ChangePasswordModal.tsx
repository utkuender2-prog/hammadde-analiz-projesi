import { useState, type FormEvent } from 'react'
import { KeyRound, X } from 'lucide-react'
import { changePassword } from './api'

export default function ChangePasswordModal({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmation) {
      setError('Yeni parolalar birbiriyle eşleşmiyor.')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      onChanged()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Parola değiştirilemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="data-modal compact" onSubmit={submit}>
        <div className="modal-heading">
          <div><span>HESAP GÜVENLİĞİ</span><h2>Parolamı değiştir</h2></div>
          <button type="button" className="close-button" onClick={onClose}><X /></button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <label className="form-field"><span>Mevcut parola</span><input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label className="form-field"><span>Yeni parola</span><input type="password" minLength={15} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label className="form-field"><span>Yeni parola tekrar</span><input type="password" minLength={15} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <p className="form-help">Değişiklikten sonra güvenlik amacıyla yeniden giriş yapmanız gerekir.</p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button>
          <button className="primary-button" disabled={busy}><KeyRound size={16} /> Parolayı değiştir</button>
        </div>
      </form>
    </div>
  )
}
