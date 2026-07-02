import { AlertTriangle, Building2, Clock3, PackageCheck, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Material } from './types'

export function StockRiskView({ materials }: { materials: Material[] }) {
  const rows = materials
    .map((material) => {
      const info = material.procurement
      const coverageDays = info.monthly_consumption > 0
        ? (info.stock / info.monthly_consumption) * 30
        : Number.POSITIVE_INFINITY
      const belowMinimum = info.stock <= info.minimum_stock
      const leadTimeRisk = coverageDays <= info.lead_time_days
      const bufferDays = coverageDays - info.lead_time_days
      const level: 'critical' | 'warning' | 'safe' = belowMinimum || leadTimeRisk
        ? 'critical'
        : bufferDays <= 10
          ? 'warning'
          : 'safe'
      return { material, coverageDays, bufferDays, level }
    })
    .sort((a, b) => a.bufferDays - b.bufferDays)

  const criticalCount = rows.filter((row) => row.level === 'critical').length
  const warningCount = rows.filter((row) => row.level === 'warning').length

  return (
    <section className="operations-view">
      <ViewHeader
        eyebrow="RİSK YÖNETİMİ"
        title="Stok Riskleri"
        description="Stok yeterliliğini tedarik süresiyle karşılaştırarak üretim risklerini önceliklendirin."
      />
      <div className="summary-grid">
        <SummaryCard icon={<ShieldAlert />} label="Kritik risk" value={`${criticalCount} malzeme`} tone="critical" />
        <SummaryCard icon={<AlertTriangle />} label="Yakın takip" value={`${warningCount} malzeme`} tone="warning" />
        <SummaryCard icon={<PackageCheck />} label="Güvenli stok" value={`${rows.length - criticalCount - warningCount} malzeme`} tone="safe" />
      </div>
      <div className="management-table-wrap">
        <table className="management-table risk-table">
          <thead>
            <tr>
              <th>Öncelik</th>
              <th>Hammadde</th>
              <th>Mevcut stok</th>
              <th>Minimum stok</th>
              <th>Stok yeterliliği</th>
              <th>Tedarik süresi</th>
              <th>Güvenlik farkı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ material, coverageDays, bufferDays, level }) => (
              <tr key={material.id}>
                <td><RiskBadge level={level} /></td>
                <td><strong>{material.name}</strong><small>{material.category}</small></td>
                <td>{material.procurement.stock.toLocaleString('tr-TR')} {material.procurement.unit}</td>
                <td>{material.procurement.minimum_stock.toLocaleString('tr-TR')} {material.procurement.unit}</td>
                <td>{Number.isFinite(coverageDays) ? `${coverageDays.toFixed(1)} gün` : 'Sınırsız'}</td>
                <td>{material.procurement.lead_time_days} gün</td>
                <td className={bufferDays < 0 ? 'negative-value' : ''}>{Number.isFinite(bufferDays) ? `${bufferDays.toFixed(1)} gün` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function SuppliersView({ materials }: { materials: Material[] }) {
  const suppliers = Object.values(
    materials.reduce<Record<string, {
      name: string
      materials: Material[]
      totalLeadTime: number
    }>>((groups, material) => {
      const name = material.procurement.supplier
      groups[name] ??= { name, materials: [], totalLeadTime: 0 }
      groups[name].materials.push(material)
      groups[name].totalLeadTime += material.procurement.lead_time_days
      return groups
    }, {}),
  ).sort((a, b) => a.name.localeCompare(b.name, 'tr'))

  const averageLeadTime = materials.length
    ? materials.reduce((sum, material) => sum + material.procurement.lead_time_days, 0) / materials.length
    : 0

  return (
    <section className="operations-view">
      <ViewHeader
        eyebrow="TEDARİK AĞI"
        title="Tedarikçiler"
        description="Tedarikçi portföyünü, sağlanan malzemeleri ve ortalama teslim sürelerini izleyin."
      />
      <div className="summary-grid">
        <SummaryCard icon={<Building2 />} label="Toplam tedarikçi" value={`${suppliers.length}`} tone="blue" />
        <SummaryCard icon={<PackageCheck />} label="Takip edilen malzeme" value={`${materials.length}`} tone="safe" />
        <SummaryCard icon={<Clock3 />} label="Ortalama tedarik süresi" value={`${averageLeadTime.toFixed(1)} gün`} tone="warning" />
      </div>
      <div className="supplier-grid">
        {suppliers.map((supplier) => {
          const average = supplier.totalLeadTime / supplier.materials.length
          return (
            <article className="supplier-card" key={supplier.name}>
              <div className="supplier-icon"><Building2 /></div>
              <div className="supplier-title">
                <h2>{supplier.name}</h2>
                <span>{supplier.materials.length} malzeme</span>
              </div>
              <div className="supplier-metric">
                <span>Ortalama tedarik</span>
                <strong>{average.toFixed(1)} gün</strong>
              </div>
              <ul>
                {supplier.materials.map((material) => (
                  <li key={material.id}>
                    <span>{material.name}</span>
                    <strong>{material.procurement.lead_time_days} gün</strong>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ViewHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="management-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <article className={`summary-card ${tone}`}>
      <div className="summary-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </article>
  )
}

function RiskBadge({ level }: { level: 'critical' | 'warning' | 'safe' }) {
  const label = level === 'critical' ? 'Kritik' : level === 'warning' ? 'Yakın takip' : 'Güvenli'
  return <span className={`risk-badge ${level}`}>{label}</span>
}
