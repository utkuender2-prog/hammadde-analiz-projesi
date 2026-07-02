import { useState, type FormEvent } from 'react'
import { BarChart3, CircleDollarSign, ExternalLink, PackagePlus, Pencil, Save, Trash2, X } from 'lucide-react'
import { addMaterialPrice, createMaterial, deleteMaterial, updateMaterial } from './api'
import type { Material, MaterialCreate, UserRole } from './types'

interface Props {
  materials: Material[]
  onChanged: () => Promise<void>
  onAnalyze: (materialId: string) => void
  role: UserRole
}

const emptyMaterial: MaterialCreate = {
  id: '',
  category: 'Hammaddeler',
  name: '',
  description: '',
  price_history: [],
  manufacturer_part_number: null,
  price_source: 'Manuel giriş',
  price_updated_at: null,
  verified_product: null,
  reference_url: null,
  procurement: {
    unit: 'kg',
    currency: 'USD',
    stock: 0,
    minimum_stock: 0,
    monthly_consumption: 0,
    lead_time_days: 0,
    supplier: '',
  },
}

function cloneMaterial(material: Material): Material {
  return {
    ...material,
    price_history: [...material.price_history],
    procurement: { ...material.procurement },
  }
}

export default function MaterialManagement({ materials, onChanged, onAnalyze, role }: Props) {
  const canEdit = role === 'editor' || role === 'admin'
  const canDelete = role === 'admin'
  const [editing, setEditing] = useState<Material | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<MaterialCreate>(emptyMaterial)
  const [priceMaterial, setPriceMaterial] = useState<Material | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [priceSource, setPriceSource] = useState('Manuel giriş')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      await onChanged()
      setMessage(success)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem başarısız oldu.')
      throw reason
    } finally {
      setBusy(false)
    }
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault()
    try {
      await run(() => createMaterial(draft), 'Hammadde başarıyla eklendi.')
      setCreating(false)
      setDraft(emptyMaterial)
    } catch {
      // Hata mesajı run tarafından gösterilir.
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    try {
      await run(
        () =>
          updateMaterial(editing.id, {
            category: editing.category,
            name: editing.name,
            description: editing.description,
            procurement: editing.procurement,
          }),
        'Hammadde bilgileri güncellendi.',
      )
      setEditing(null)
    } catch {
      // Hata mesajı run tarafından gösterilir.
    }
  }

  async function submitPrice(event: FormEvent) {
    event.preventDefault()
    if (!priceMaterial || Number(newPrice) <= 0) return
    try {
      await run(
        () => addMaterialPrice(priceMaterial.id, Number(newPrice), priceSource),
        'Yeni fiyat verisi eklendi.',
      )
      setPriceMaterial(null)
      setNewPrice('')
      setPriceSource('Manuel giriş')
    } catch {
      // Hata mesajı run tarafından gösterilir.
    }
  }

  async function remove(material: Material) {
    if (!window.confirm(`${material.name} kalıcı olarak silinsin mi?`)) return
    try {
      await run(() => deleteMaterial(material.id), 'Hammadde silindi.')
    } catch {
      // Hata mesajı run tarafından gösterilir.
    }
  }

  return (
    <section className="management">
      <div className="management-header">
        <div>
          <p className="eyebrow">VERİ YÖNETİMİ</p>
          <h1>Hammadde ve Fiyat Yönetimi</h1>
          <p>Stok, tedarik ve fiyat verilerini SQLite veritabanında yönetin.</p>
        </div>
        {canEdit && <button className="primary-button" onClick={() => setCreating(true)}>
          <PackagePlus size={18} /> Yeni hammadde
        </button>}
      </div>

      {message && <div className="success-state">{message}</div>}
      {error && <div className="error-state">{error}</div>}

      <div className="management-table-wrap">
        <table className="management-table">
          <thead>
            <tr>
              <th>Hammadde</th>
              <th>Kategori</th>
              <th>Stok</th>
              <th>Aylık tüketim</th>
              <th>Son fiyat</th>
              <th>Fiyat kaynağı</th>
              <th>Tedarik süresi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>
                  <strong>{material.name}</strong>
                  <small>{material.verified_product || material.procurement.supplier}</small>
                  {material.reference_url && <a className="source-link" href={material.reference_url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Resmî kaynak</a>}
                </td>
                <td><span className="category-tag">{material.category}</span></td>
                <td>{material.procurement.stock.toLocaleString('tr-TR')} {material.procurement.unit}</td>
                <td>{material.procurement.monthly_consumption.toLocaleString('tr-TR')} {material.procurement.unit}</td>
                <td>${(material.price_history.at(-1) ?? 0).toLocaleString('tr-TR')}</td>
                <td><strong>{material.price_source}</strong><small>{material.price_updated_at ? new Date(material.price_updated_at).toLocaleString('tr-TR') : 'Henüz güncellenmedi'}</small></td>
                <td>{material.procurement.lead_time_days} gün</td>
                <td>
                  <div className="table-actions">
                    <button className="analyze-button" title="Analizi aç" onClick={() => onAnalyze(material.id)}><BarChart3 size={16} /></button>
                    {canEdit && <button title="Düzenle" onClick={() => setEditing(cloneMaterial(material))}><Pencil size={16} /></button>}
                    {canEdit && <button title="Fiyat ekle" onClick={() => setPriceMaterial(material)}><CircleDollarSign size={16} /></button>}
                    {canDelete && <button className="danger" title="Sil" onClick={() => remove(material)}><Trash2 size={16} /></button>}
                    {!canEdit && <span className="readonly-label">Salt okunur</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <div className="modal-backdrop">
          <form className="data-modal" onSubmit={creating ? submitCreate : submitEdit}>
            <div className="modal-heading">
              <div><span>{creating ? 'YENİ KAYIT' : 'KAYIT DÜZENLE'}</span><h2>{creating ? 'Hammadde ekle' : editing?.name}</h2></div>
              <button type="button" className="close-button" onClick={() => { setCreating(false); setEditing(null) }}><X /></button>
            </div>
            <MaterialFields
              value={creating ? draft : editing!}
              includeId={creating}
              onChange={(value) => creating ? setDraft(value) : setEditing(value)}
            />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => { setCreating(false); setEditing(null) }}>Vazgeç</button>
              <button className="primary-button" disabled={busy}><Save size={17} /> Kaydet</button>
            </div>
          </form>
        </div>
      )}

      {priceMaterial && (
        <div className="modal-backdrop">
          <form className="data-modal compact" onSubmit={submitPrice}>
            <div className="modal-heading">
              <div><span>FİYAT GİRİŞİ</span><h2>{priceMaterial.name}</h2></div>
              <button type="button" className="close-button" onClick={() => setPriceMaterial(null)}><X /></button>
            </div>
            <label className="form-field">
              <span>Yeni fiyat ({priceMaterial.procurement.currency})</span>
              <input type="number" min="0.0001" step="0.0001" required value={newPrice} onChange={(event) => setNewPrice(event.target.value)} />
            </label>
            <label className="form-field">
              <span>Fiyat kaynağı</span>
              <input required value={priceSource} onChange={(event) => setPriceSource(event.target.value)} placeholder="Tedarikçi teklifi, Mouser, DigiKey..." />
            </label>
            <p className="form-help">Kayıt zamanı otomatik olarak şu anki tarih ve saat olacaktır.</p>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setPriceMaterial(null)}>Vazgeç</button>
              <button className="primary-button" disabled={busy}><CircleDollarSign size={17} /> Fiyatı ekle</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

interface FieldsProps {
  value: MaterialCreate
  includeId: boolean
  onChange: (value: MaterialCreate) => void
}

function MaterialFields({ value, includeId, onChange }: FieldsProps) {
  const set = (field: keyof MaterialCreate, next: string) =>
    onChange({ ...value, [field]: next })
  const setProcurement = (field: keyof MaterialCreate['procurement'], next: string | number) =>
    onChange({ ...value, procurement: { ...value.procurement, [field]: next } })

  return (
    <div className="form-grid">
      {includeId && <label className="form-field"><span>Kimlik</span><input required placeholder="ornek-aluminyum" value={value.id} onChange={(e) => set('id', e.target.value)} /></label>}
      <label className="form-field"><span>Hammadde adı</span><input required value={value.name} onChange={(e) => set('name', e.target.value)} /></label>
      <label className="form-field"><span>Kategori</span><input required value={value.category} onChange={(e) => set('category', e.target.value)} /></label>
      <label className="form-field"><span>Üretici parça numarası</span><input value={value.manufacturer_part_number ?? ''} onChange={(e) => set('manufacturer_part_number', e.target.value)} placeholder="Örn. MT6789" /></label>
      <label className="form-field"><span>Tedarikçi</span><input required value={value.procurement.supplier} onChange={(e) => setProcurement('supplier', e.target.value)} /></label>
      <label className="form-field wide"><span>Açıklama</span><textarea required value={value.description} onChange={(e) => set('description', e.target.value)} /></label>
      <label className="form-field"><span>Birim</span><input required value={value.procurement.unit} onChange={(e) => setProcurement('unit', e.target.value)} /></label>
      <label className="form-field"><span>Para birimi</span><input required value={value.procurement.currency} onChange={(e) => setProcurement('currency', e.target.value)} /></label>
      <NumberField label="Stok" value={value.procurement.stock} onChange={(next) => setProcurement('stock', next)} />
      <NumberField label="Minimum stok" value={value.procurement.minimum_stock} onChange={(next) => setProcurement('minimum_stock', next)} />
      <NumberField label="Aylık tüketim" value={value.procurement.monthly_consumption} onChange={(next) => setProcurement('monthly_consumption', next)} />
      <NumberField label="Tedarik süresi (gün)" value={value.procurement.lead_time_days} onChange={(next) => setProcurement('lead_time_days', next)} />
      {includeId && <label className="form-field wide"><span>İlk fiyat</span><input type="number" min="0.0001" step="0.0001" required onChange={(e) => onChange({ ...value, price_history: [Number(e.target.value)] })} /></label>}
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="form-field"><span>{label}</span><input type="number" min="0" step="0.01" required value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>
}
