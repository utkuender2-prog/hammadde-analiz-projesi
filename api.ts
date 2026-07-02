import type {
  Material,
  MaterialAnalysis,
  MaterialCreate,
  MaterialUpdate,
  CurrentUser,
  AccountLink,
  AdminUser,
  AuditLog,
  UserRole,
  Product,
  ProductCreate,
  TimeFrame,
} from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event('auth-expired'))
    }
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail ?? `Backend isteği başarısız oldu (${response.status}).`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function login(username: string, password: string) {
  await request<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return getCurrentUser()
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' })
}

export function getCurrentUser() {
  return request<CurrentUser>('/auth/me')
}

export function getMaterials() {
  return request<Material[]>('/api/materials')
}

export function getAnalysis(materialId: string, timeframe: TimeFrame) {
  return request<MaterialAnalysis>(
    `/api/materials/${encodeURIComponent(materialId)}/analysis?timeframe=${timeframe}`,
  )
}

export function createMaterial(material: MaterialCreate) {
  return request<Material>('/api/materials', {
    method: 'POST',
    body: JSON.stringify(material),
  })
}

export function updateMaterial(materialId: string, update: MaterialUpdate) {
  return request<Material>(`/api/materials/${encodeURIComponent(materialId)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export function addMaterialPrice(materialId: string, price: number, source: string) {
  return request<Material>(`/api/materials/${encodeURIComponent(materialId)}/prices`, {
    method: 'POST',
    body: JSON.stringify({ price, source }),
  })
}

export function deleteMaterial(materialId: string) {
  return request<void>(`/api/materials/${encodeURIComponent(materialId)}`, {
    method: 'DELETE',
  })
}

export function getUsers() {
  return request<AdminUser[]>('/auth/users')
}

export function updateUser(
  username: string,
  update: { role?: UserRole; is_active?: boolean },
) {
  return request<AdminUser>(`/auth/users/${encodeURIComponent(username)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export function revokeUserSessions(username: string) {
  return request<void>(`/auth/users/${encodeURIComponent(username)}/revoke-sessions`, {
    method: 'POST',
  })
}

export function createInvitation(username: string, role: UserRole, expiresHours: number) {
  return request<AccountLink>('/auth/invitations', {
    method: 'POST',
    body: JSON.stringify({ username, role, expires_hours: expiresHours }),
  })
}

export function revokeInvitation(token: string) {
  return request<void>(`/auth/invitations/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  })
}

export function acceptInvitation(token: string, password: string) {
  return request<CurrentUser>('/auth/invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function createPasswordResetLink(username: string) {
  return request<AccountLink>('/auth/password-reset-links', {
    method: 'POST',
    body: JSON.stringify({ username, expires_hours: 1 }),
  })
}

export function completePasswordReset(token: string, newPassword: string) {
  return request<void>('/auth/password-reset/complete', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}

export function getAuditLogs() {
  return request<AuditLog[]>('/auth/audit-logs')
}

export function getProducts() {
  return request<Product[]>('/api/products')
}

export function createProduct(product: ProductCreate) {
  return request<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  })
}

export function updateProduct(
  productId: string,
  update: Partial<Omit<ProductCreate, 'id'>>,
) {
  return request<Product>(`/api/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export function deleteProduct(productId: string) {
  return request<void>(`/api/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })
}

export function addBomItem(
  productId: string,
  item: { material_id: string; quantity: number; notes: string },
) {
  return request<Product>(`/api/products/${encodeURIComponent(productId)}/bom`, {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

export function updateBomItem(
  productId: string,
  itemId: number,
  update: { quantity?: number; notes?: string },
) {
  return request<Product>(
    `/api/products/${encodeURIComponent(productId)}/bom/${itemId}`,
    { method: 'PATCH', body: JSON.stringify(update) },
  )
}

export function deleteBomItem(productId: string, itemId: number) {
  return request<Product>(
    `/api/products/${encodeURIComponent(productId)}/bom/${itemId}`,
    { method: 'DELETE' },
  )
}
