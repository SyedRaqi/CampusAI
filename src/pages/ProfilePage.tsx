import { useAuth } from '../contexts/AuthContext'
import PageContainer from '../components/PageContainer'

export default function ProfilePage() {
  const { profile, role, user, signOut } = useAuth()

  return (
    <PageContainer className="placeholder-shell">
      <div style={{ maxWidth: 900, margin: '0 auto', background: 'rgba(16,24,40,0.62)', borderRadius: 24, padding: '2rem', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: 1.8, opacity: 0.7, margin: 0 }}>Profile</p>
            <h1 style={{ margin: '0.5rem 0 0' }}>{profile?.full_name || 'Campus member'}</h1>
          </div>
          <button type="button" className="cc-button cc-button-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ opacity: 0.7 }}>Role</p>
            <strong>{role || 'Not assigned'}</strong>
          </div>
          <div>
            <p style={{ opacity: 0.7 }}>User ID</p>
            <strong>{user?.id || 'Not available'}</strong>
          </div>
          <div>
            <p style={{ opacity: 0.7 }}>Department</p>
            <strong>{profile?.department || 'Not set'}</strong>
          </div>
        </div>

        <p style={{ opacity: 0.8 }}>
          Your Supabase-backed profile data is available here once the database schema and sample user records are created in your project.
        </p>
      </div>
    </PageContainer>
  )
}
