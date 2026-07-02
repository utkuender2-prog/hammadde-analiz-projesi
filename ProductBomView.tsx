import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Boxes,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import {
  addBomItem,
  createProduct,
  deleteBomItem,
  deleteProduct,
  getProducts,
  updateBomItem,
  updateProduct,
} from './api'
import type { BomItem, Material, Product, ProductCreate, UserRole } from './types'

const emptyProduct: ProductCreate = {
  id: '',
  name: '',
  category: 'Akıllı Telefon',
  description: '',
  is_active: true,
}

export default function ProductBomView({
  materials,
  role,
}: {
  materials: Material[]
  role: UserRole
}) {
  const canEdit = role === 'editor' || role === 'admin'
  const canDelete = role === 'admin'
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [draft, setDraft] = useState<ProductCreate>(emptyProduct)
  const [addingBom, setAddingBom] = useState(false)
  const [editingBom, setEditingBom] = useState<BomItem | null>(null)
  const [bomMaterialId, setBomMaterialId] = useState('')
  const [bomQuantity, setBomQuantity] = useState(1)
  const [bomNotes, setBomNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selected = products.find((product) => product.id === selectedId) ?? products[0]
  const usedMaterialIds = new Set(selected?.bom_items.map((item) => item.material_id) ?? [])
  const availableMaterials = materials.filter((material) => !usedMaterialIds.has(material.id))
  const totalBomItems = useMemo(
    () => products.reduce((total, product) => total + product.bom_items.length, 0),
    [products],
  )

  async function load(preferredId?: string) {
    const result = await getProducts()
    setProducts(result)
    setSelectedId((current) => {
      const candidate = preferredId ?? current
      return result.some((product) => product.id === candidate)
        ? candidate
        : (result[0]?.id ?? '')
    })
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message))
  }, [])

  async function run(
    action: () => Promise<unknown>,
    success: string,
    preferredId?: string,
  ) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
      await load(preferredId)
      setMessage(success)
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault()
    if (creating) {
      const success = await run(() => createProduct(draft), 'Ürün oluşturuldu.', draft.id)
      if (success) {
        setCreating(false)
        setDraft(emptyProduct)
      }
      return
    }
    if (!editingProduct) return
    const success = await run(
      () => updateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        description: editingProduct.description,
        is_active: editingProduct.is_active,
      }),
      'Ürün bilgileri güncellendi.',
      editingProduct.id,
    )
    if (success) setEditingProduct(null)
  }

  async function submitBom(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    if (editingBom) {
      const success = await run(
        () => updateBomItem(selected.id, editingBom.id, {
          quantity: bomQuantity,
          notes: bomNotes,
        }),
        'BOM kalemi güncellendi.',
        selected.id,
      )
      if (success) closeBomModal()
      return
    }
    const success = await run(
      () => addBomItem(selected.id, {
        material_id: bomMaterialId,
        quantity: bomQuantity,
        notes: bomNotes,
      }),
      'Malzeme ürün reçetesine eklendi.',
      selected.id,
    )
    if (success) closeBomModal()
  }

  function openNewBom() {
    setEditingBom(null)
    setBomMaterialId(availableMaterials[0]?.id ?? '')
    setBomQuantity(1)
    setBomNotes('')
    setAddingBom(true)
  }

  function openEditBom(item: BomItem) {
    setEditingBom(item)
    setBomMaterialId(item.material_id)
    setBomQuantity(item.quantity)
    setBomNotes(item.notes)
    setAddingBom(true)
  }

  function closeBomModal() {
    setAddingBom(false)
    setEditingBom(null)
    setBomMaterialId('')
    setBomQuantity(1)
    setBomNotes('')
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`${product.name} ve ürün reçetesi silinsin mi?`)) return
    await run(() => deleteProduct(product.id), 'Ürün silindi.')
  }

  async function removeBom(item: BomItem) {
    if (!selected || !window.confirm(`${item.material_name} reçeteden kaldırılsın mı?`)) return
    await run(
      () => deleteBomItem(selected.id, item.id),
      'BOM kalemi kaldırıldı.',
      selected.id,
    )
  }

  return (
    <section className="product-bom-view">
      <div className="management-header">
        <div>
          <p className="eyebrow">ÜRÜN REÇETESİ YÖNETİMİ</p>
          <h1>Ürünler ve BOM</h1>
          <p>Reeder ürünlerini, kullanılan malzemeleri ve ürün başına tüketim miktarlarını yönetin.</p>
        </div>
        {canEdit && <button className="primary-button" onClick={() => setCreating(true)}><PackagePlus size={18} /> Yeni ürün</button>}
      </div>

      {message && <div className="success-state">{message}</div>}
      {error && <div className="error-state">{error}</div>}

      <div className="summary-grid product-summary">
        <Summary icon={<Boxes />} label="Toplam ürün" value={`${products.length}`} />
        <Summary icon={<ClipboardList />} label="Toplam BOM kalemi" value={`${totalBomItems}`} />
        <Summary icon={<CheckCircle2 />} label="Aktif ürün" value={`${products.filter((product) => product.is_active).length}`} />
      </div>

      <div className="bom-layout">
        <aside className="product-list-panel">
          <div className="product-list-heading"><span>ÜRÜN KATALOĞU</span><strong>{products.length} ürün</strong></div>
          <div className="product-list">
            {products.map((product) => (
              <button
                className={`product-list-item ${selected?.id === product.id ? 'active' : ''}`}
                key={product.id}
                onClick={() => setSelectedId(product.id)}
              >
                <span className="product-list-icon"><Boxes /></span>
                <span><strong>{product.name}</strong><small>{product.category} · {product.bom_items.length} kalem</small></span>
                <i className={product.is_active ? 'active' : 'inactive'} />
              </button>
            ))}
          </div>
        </aside>

        {selected ? (
          <article className="panel bom-detail-panel">
            <div className="bom-product-header">
              <div><span className="panel-label">ÜRÜN REÇETESİ</span><h2>{selected.name}</h2><p>{selected.description}</p></div>
              <div className="bom-header-actions">
                {canEdit && <button className="secondary-button" onClick={() => setEditingProduct({ ...selected, bom_items: [...selected.bom_items] })}><Pencil size={16} /> Ürünü düzenle</button>}
                {canDelete && <button className="danger-text-button" onClick={() => removeProduct(selected)}><Trash2 size={16} /> Sil</button>}
              </div>
            </div>

            <div className="bom-toolbar">
              <div><strong>{selected.bom_items.length} malzeme</strong><span>Ürün başına kullanım miktarı</span></div>
              {canEdit && <button className="primary-button" disabled={!availableMaterials.length} onClick={openNewBom}><Plus size={16} /> Malzeme bağla</button>}
            </div>

            <div className="bom-table-wrap">
              <table className="management-table bom-table">
                <thead><tr><th>Malzeme</th><th>Miktar</th><th>Not</th><th>İşlemler</th></tr></thead>
                <tbody>
                  {selected.bom_items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.material_name}</strong><small>{item.material_id}</small></td>
                      <td><span className="bom-quantity">{item.quantity.toLocaleString('tr-TR')} {item.unit}</span></td>
                      <td>{item.notes || '—'}</td>
                      <td>
                        {canEdit ? <div className="table-actions">
                          <button title="Düzenle" onClick={() => openEditBom(item)}><Pencil size={15} /></button>
                          <button className="danger" title="Kaldır" onClick={() => removeBom(item)}><Trash2 size={15} /></button>
                        </div> : <span className="readonly-label">Salt okunur</span>}
                      </td>
                    </tr>
                  ))}
                  {!selected.bom_items.length && <tr><td colSpan={4} className="empty-table-state">Bu ürün için henüz BOM kalemi bulunmuyor.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>
        ) : <div className="panel empty-table-state">Henüz ürün bulunmuyor.</div>}
      </div>

      {(creating || editingProduct) && (
        <div className="modal-backdrop">
          <form className="data-modal compact" onSubmit={submitProduct}>
            <div className="modal-heading">
              <div><span>{creating ? 'YENİ ÜRÜN' : 'ÜRÜN DÜZENLE'}</span><h2>{creating ? 'Ürün oluştur' : editingProduct?.name}</h2></div>
              <button type="button" className="close-button" onClick={() => { setCreating(false); setEditingProduct(null) }}><X /></button>
            </div>
            {creating && <label className="form-field"><span>Ürün kimliği</span><input required pattern="[a-z0-9-]+" value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value.toLowerCase() })} placeholder="reeder-ornek-model" /></label>}
            <label className="form-field"><span>Ürün adı</span><input required value={creating ? draft.name : editingProduct!.name} onChange={(event) => creating ? setDraft({ ...draft, name: event.target.value }) : setEditingProduct({ ...editingProduct!, name: event.target.value })} /></label>
            <label className="form-field"><span>Kategori</span><input required value={creating ? draft.category : editingProduct!.category} onChange={(event) => creating ? setDraft({ ...draft, category: event.target.value }) : setEditingProduct({ ...editingProduct!, category: event.target.value })} /></label>
            <label className="form-field"><span>Açıklama</span><textarea required value={creating ? draft.description : editingProduct!.description} onChange={(event) => creating ? setDraft({ ...draft, description: event.target.value }) : setEditingProduct({ ...editingProduct!, description: event.target.value })} /></label>
            {!creating && <label className="checkbox-field"><input type="checkbox" checked={editingProduct!.is_active} onChange={(event) => setEditingProduct({ ...editingProduct!, is_active: event.target.checked })} /><span>Ürün aktif</span></label>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setCreating(false); setEditingProduct(null) }}>Vazgeç</button><button className="primary-button" disabled={busy}><Save size={16} /> Kaydet</button></div>
          </form>
        </div>
      )}

      {addingBom && selected && (
        <div className="modal-backdrop">
          <form className="data-modal compact" onSubmit={submitBom}>
            <div className="modal-heading">
              <div><span>BOM KALEMİ</span><h2>{editingBom ? 'Malzeme kullanımını düzenle' : 'Ürüne malzeme bağla'}</h2></div>
              <button type="button" className="close-button" onClick={closeBomModal}><X /></button>
            </div>
            <label className="form-field"><span>Malzeme</span>
              <select disabled={Boolean(editingBom)} required value={bomMaterialId} onChange={(event) => setBomMaterialId(event.target.value)}>
                {(editingBom ? materials.filter((material) => material.id === editingBom.material_id) : availableMaterials).map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
              </select>
            </label>
            <label className="form-field"><span>Ürün başına miktar</span><input type="number" min="0.0001" step="0.0001" required value={bomQuantity} onChange={(event) => setBomQuantity(Number(event.target.value))} /></label>
            <label className="form-field"><span>Not</span><textarea value={bomNotes} onChange={(event) => setBomNotes(event.target.value)} placeholder="Doğrulama veya montaj notu..." /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeBomModal}>Vazgeç</button><button className="primary-button" disabled={busy}><Save size={16} /> Kaydet</button></div>
          </form>
        </div>
      )}
    </section>
  )
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <article className="summary-card safe"><div className="summary-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></article>
}
