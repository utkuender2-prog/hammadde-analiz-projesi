export type TimeFrame = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
export type UserRole = 'viewer' | 'editor' | 'admin'

export interface CurrentUser {
  username: string
  role: UserRole
}

export interface AdminUser extends CurrentUser {
  is_active: boolean
  created_at?: string | null
  last_login_at?: string | null
}

export interface AccountLink {
  token: string
  path: string
  expires_at: string
}

export interface AuditLog {
  id: number
  actor: string
  action: string
  target: string
  details: string
  created_at: string
}

export interface ProcurementInfo {
  unit: string
  currency: string
  stock: number
  minimum_stock: number
  monthly_consumption: number
  lead_time_days: number
  supplier: string
}

export interface Material {
  id: string
  category: string
  name: string
  description: string
  price_history: number[]
  procurement: ProcurementInfo
  manufacturer_part_number?: string | null
  price_source: string
  price_updated_at?: string | null
  verified_product?: string | null
  reference_url?: string | null
}

export type MaterialCreate = Material

export interface MaterialUpdate {
  category?: string
  name?: string
  description?: string
  procurement?: ProcurementInfo
}

export interface MaterialAnalysis {
  material: Material
  timeframe: TimeFrame
  price_points: Array<{ timestamp: string; price: number }>
  current_price: number
  minimum_price: number
  maximum_price: number
  average_price: number
  indicators: {
    sma5: Array<number | null>
    sma14: Array<number | null>
    ema5: Array<number | null>
    ema14: Array<number | null>
    rsi14: Array<number | null>
  }
  decision: {
    status: string
    stock_coverage_days: number
    reason: string
  }
  data_point_count: number
  indicator_data_sufficient: boolean
}

export interface BomItem {
  id: number
  material_id: string
  material_name: string
  quantity: number
  unit: string
  notes: string
}

export interface Product {
  id: string
  name: string
  category: string
  description: string
  is_active: boolean
  created_at: string
  bom_items: BomItem[]
}

export interface ProductCreate {
  id: string
  name: string
  category: string
  description: string
  is_active: boolean
}
