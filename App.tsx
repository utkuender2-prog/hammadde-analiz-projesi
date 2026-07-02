import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  Gauge,
  LogOut,
  KeyRound,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './App.css'
import { getAnalysis, getCurrentUser, getMaterials, logout } from './api'
import LoginScreen from './LoginScreen'
import AccountLinkScreen from './AccountLinkScreen'
import ChangePasswordModal from './ChangePasswordModal'
import MaterialManagement from './MaterialManagement'
import ProductBomView from './ProductBomView'
import UserManagement from './UserManagement'
import { StockRiskView, SuppliersView } from './OperationsViews'
import type { CurrentUser, Material, MaterialAnalysis, TimeFrame } from './types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

const timeframes: Array<{ value: TimeFrame; label: string }> = [
  { value: 'minute', label: 'Dakikalık' },
  { value: 'hour', label: 'Saatlik' },
  { value: 'day', label: 'Günlük' },
  { value: 'week', label: 'Haftalık' },
  { value: 'month', label: 'Aylık' },
  { value: 'year', label: 'Yıllık' },
]

const money = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function lastValue(values: Array<number | null>) {
  return [...values].reverse().find((value) => value !== null) ?? 0
}

function App() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialId, setMaterialId] = useState('bakir-tel')
  const [timeframe, setTimeframe] = useState<TimeFrame>('day')
  const [analysis, setAnalysis] = useState<MaterialAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [view, setView] = useState<'overview' | 'materials' | 'products' | 'risks' | 'suppliers' | 'users'>('overview')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [passwordModal, setPasswordModal] = useState(false)

  useEffect(() => {
    const expire = () => setUser(null)
    window.addEventListener('auth-expired', expire)
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true))
    return () => window.removeEventListener('auth-expired', expire)
  }, [])

  async function reloadMaterials() {
    await getMaterials()
      .then((result) => {
        setMaterials(result)
        setMaterialId((current) =>
          result.some((material) => material.id === current)
            ? current
            : (result[0]?.id ?? current),
        )
      })
      .catch((reason: Error) => setError(reason.message))
    setRefreshToken((value) => value + 1)
  }

  useEffect(() => {
    if (user) reloadMaterials()
  }, [user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    getAnalysis(materialId, timeframe)
      .then(setAnalysis)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [materialId, timeframe, refreshToken, user])

  const labels = useMemo(
    () =>
      analysis?.price_points.map((point) =>
        new Intl.DateTimeFormat('tr-TR', {
          day: timeframe === 'year' ? undefined : '2-digit',
          month: timeframe === 'year' ? undefined : 'short',
          year: timeframe === 'year' ? 'numeric' : undefined,
          hour: timeframe === 'minute' || timeframe === 'hour' ? '2-digit' : undefined,
          minute: timeframe === 'minute' || timeframe === 'hour' ? '2-digit' : undefined,
        }).format(new Date(point.timestamp)),
      ) ?? [],
    [analysis, timeframe],
  )

  const priceChart = useMemo(() => {
    if (!analysis) return null
    return {
      labels,
      datasets: [
        {
          label: 'Fiyat',
          data: analysis.price_points.map((point) => point.price),
          borderColor: '#4d8d39',
          backgroundColor: 'rgba(103, 181, 71, 0.16)',
          fill: true,
          tension: timeframe === 'year' ? 0.18 : 0.36,
          borderWidth: timeframe === 'year' ? 3 : 2,
          pointRadius: timeframe === 'year' ? 6 : timeframe === 'month' ? 4 : 2,
          pointHoverRadius: timeframe === 'year' ? 8 : 5,
        },
        {
          label: 'EMA(5)',
          data: analysis.indicators.ema5,
          borderColor: '#67b547',
          tension: 0.34,
          pointRadius: 0,
        },
        {
          label: 'SMA(5)',
          data: analysis.indicators.sma5,
          borderColor: '#f59e0b',
          borderDash: [7, 5],
          tension: 0.34,
          pointRadius: 0,
        },
      ],
    }
  }, [analysis, labels, timeframe])

  const rsiChart = useMemo(() => {
    if (!analysis) return null
    return {
      labels,
      datasets: [
        {
          label: 'RSI(14)',
          data: analysis.indicators.rsi14,
          borderColor: '#76bf55',
          backgroundColor: 'rgba(118, 191, 85, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    }
  }, [analysis, labels])

  const decisionClass = analysis?.decision.status.includes('KRİTİK')
    ? 'critical'
    : analysis?.decision.status.includes('FIRSATI')
      ? 'positive'
      : analysis?.decision.status.includes('BEKLE')
        ? 'warning'
        : 'neutral'

  const linkParams = new URLSearchParams(window.location.search)
  const invitationToken = linkParams.get('invite')
  const resetToken = linkParams.get('reset')
  if (invitationToken) return <AccountLinkScreen mode="invite" token={invitationToken} />
  if (resetToken) return <AccountLinkScreen mode="reset" token={resetToken} />

  if (!authReady) {
    return <div className="loading-state full-page"><RefreshCw className="spin" /> Güvenli oturum kontrol ediliyor...</div>
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />
  }

  async function signOut() {
    try {
      await logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="sidebar-logo"><img src="/reeder-logo.png" alt="Reeder" /></div>
          <span className="brand-subtitle">Tedarik Zekâsı</span>
        </div>
        <nav>
          <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}><BarChart3 size={19} /> Genel Bakış</button>
          <button className={`nav-item ${view === 'materials' ? 'active' : ''}`} onClick={() => setView('materials')}><Boxes size={19} /> Hammaddeler</button>
          <button className={`nav-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}><ClipboardList size={19} /> Ürünler ve BOM</button>
          <button className={`nav-item ${view === 'risks' ? 'active' : ''}`} onClick={() => setView('risks')}><AlertTriangle size={19} /> Stok Riskleri</button>
          <button className={`nav-item ${view === 'suppliers' ? 'active' : ''}`} onClick={() => setView('suppliers')}><PackageSearch size={19} /> Tedarikçiler</button>
          {user.role === 'admin' && <button className={`nav-item ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}><Users size={19} /> Kullanıcı Yönetimi</button>}
        </nav>
        <div className="system-status">
          <span className="status-dot" />
          <div><strong>{user.username}</strong><small>{user.role} · Sistem aktif</small></div>
          <button className="logout-button" title="Parolamı değiştir" onClick={() => setPasswordModal(true)}><KeyRound size={16} /></button>
          <button className="logout-button" title="Çıkış yap" onClick={signOut}><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-content">
        {view === 'materials' ? (
          <MaterialManagement
            materials={materials}
            onChanged={reloadMaterials}
            onAnalyze={(selectedMaterialId) => {
              setMaterialId(selectedMaterialId)
              setView('overview')
            }}
            role={user.role}
          />
        ) : view === 'products' ? (
          <ProductBomView materials={materials} role={user.role} />
        ) : view === 'risks' ? (
          <StockRiskView materials={materials} />
        ) : view === 'suppliers' ? (
          <SuppliersView materials={materials} />
        ) : view === 'users' && user.role === 'admin' ? (
          <UserManagement currentUsername={user.username} />
        ) : (
        <>
        <header className="topbar">
          <div>
            <p className="eyebrow">KARAR DESTEK PANELİ</p>
            <h1>Hammadde Tedarik Analizi</h1>
            <p>Fiyat hareketlerini, stok riskini ve satın alma önerilerini tek ekranda izleyin.</p>
          </div>
          <div className="header-badge"><ShieldCheck size={18} /> Yerel ve güvenli</div>
        </header>

        <section className="filters">
          <label>
            <span>Hammadde</span>
            <select value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>{material.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Zaman aralığı</span>
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value as TimeFrame)}>
              {timeframes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="refresh-button" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={17} /> Veriyi yenile
          </button>
        </section>

        {error && <div className="error-state">{error}</div>}
        {loading && <div className="loading-state"><RefreshCw className="spin" /> Analiz yükleniyor...</div>}

        {!loading && analysis && (
          <>
            <section className="kpi-grid">
              <article className="kpi-card">
                <div className="icon-box blue"><CircleDollarSign /></div>
                <div><span>Güncel fiyat</span><strong>${money.format(analysis.current_price)}</strong><small>Min ${money.format(analysis.minimum_price)} · Max ${money.format(analysis.maximum_price)}</small></div>
              </article>
              <article className="kpi-card">
                <div className="icon-box purple"><Gauge /></div>
                <div>
                  <span>RSI (14)</span>
                  <strong>{analysis.indicator_data_sufficient ? money.format(lastValue(analysis.indicators.rsi14)) : 'Yetersiz veri'}</strong>
                  <small>{analysis.data_point_count}/15 fiyat kaydı</small>
                </div>
              </article>
              <article className="kpi-card">
                <div className="icon-box amber"><CalendarRange /></div>
                <div><span>Stok yeterliliği</span><strong>{money.format(analysis.decision.stock_coverage_days)} gün</strong><small>Tedarik süresi {analysis.material.procurement.lead_time_days} gün</small></div>
              </article>
              <article className={`kpi-card decision ${decisionClass}`}>
                <div className="icon-box"><TrendingUp /></div>
                <div><span>Satın alma kararı</span><strong>{analysis.decision.status}</strong><small>Otomatik karar motoru</small></div>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel price-panel">
                <div className="panel-heading">
                  <div><span>FİYAT ANALİZİ</span><h2>{analysis.material.name}</h2></div>
                  <div className="currency-pill">{analysis.material.procurement.currency} / {analysis.material.procurement.unit}</div>
                </div>
                {priceChart && <Line data={priceChart} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } } }} />}
              </article>

              <article className={`panel decision-panel ${decisionClass}`}>
                <span className="panel-label">TEDARİK ÖNERİSİ</span>
                <div className="decision-icon"><TrendingUp size={28} /></div>
                <h2>{analysis.decision.status}</h2>
                <p>{analysis.decision.reason}</p>
                <div className="decision-meta">
                  <div><span>Mevcut stok</span><strong>{analysis.material.procurement.stock.toLocaleString('tr-TR')} {analysis.material.procurement.unit}</strong></div>
                  <div><span>Minimum stok</span><strong>{analysis.material.procurement.minimum_stock.toLocaleString('tr-TR')} {analysis.material.procurement.unit}</strong></div>
                </div>
              </article>

              <article className="panel rsi-panel">
                <div className="panel-heading">
                  <div><span>MOMENTUM</span><h2>RSI (14)</h2></div>
                  <div className="rsi-legend"><i className="overbought" /> 70 Aşırı alım <i className="oversold" /> 30 Aşırı satım</div>
                </div>
                {!analysis.indicator_data_sufficient && (
                  <div className="data-quality-note">RSI hesaplamak için seçilen dönemde en az 15 fiyat kaydı gerekir.</div>
                )}
                {rsiChart && <Line data={rsiChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }} />}
              </article>

              <article className="panel supply-panel">
                <span className="panel-label">TEDARİK BİLGİLERİ</span>
                <dl>
                  <div><dt>Tedarikçi</dt><dd>{analysis.material.procurement.supplier}</dd></div>
                  <div><dt>Üretici parça no.</dt><dd>{analysis.material.manufacturer_part_number || 'BOM ile doğrulanacak'}</dd></div>
                  <div><dt>Fiyat kaynağı</dt><dd>{analysis.material.price_source}</dd></div>
                  <div><dt>Son güncelleme</dt><dd>{analysis.material.price_updated_at ? new Date(analysis.material.price_updated_at).toLocaleString('tr-TR') : 'Henüz güncellenmedi'}</dd></div>
                  <div>
                    <dt>Doğrulanan ürün</dt>
                    <dd>
                      {analysis.material.reference_url ? (
                        <a className="source-link" href={analysis.material.reference_url} target="_blank" rel="noreferrer">
                          {analysis.material.verified_product} <ExternalLink size={13} />
                        </a>
                      ) : 'BOM doğrulaması gerekli'}
                    </dd>
                  </div>
                  <div><dt>Aylık tüketim</dt><dd>{analysis.material.procurement.monthly_consumption.toLocaleString('tr-TR')} {analysis.material.procurement.unit}</dd></div>
                  <div><dt>Tedarik süresi</dt><dd>{analysis.material.procurement.lead_time_days} gün</dd></div>
                  <div><dt>Ortalama fiyat</dt><dd>${money.format(analysis.average_price)}</dd></div>
                </dl>
              </article>
            </section>
          </>
        )}
        </>
        )}
      </main>
      {passwordModal && (
        <ChangePasswordModal
          onClose={() => setPasswordModal(false)}
          onChanged={() => {
            setPasswordModal(false)
            signOut()
          }}
        />
      )}
    </div>
  )
}

export default App
