import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'

export default function RoleRoute({ allowedRoles, children }: { allowedRoles: UserRole[]; children?: ReactNode }) {
  const { role, loading, user } = useAuth()

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading access permissions...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!role || !allowedRoles.includes(role)) {
    const fallback = role ? `/${role}/dashboard` : '/login'
    return <Navigate to={fallback} replace />
  }

  return children ?? <Outlet />
}
