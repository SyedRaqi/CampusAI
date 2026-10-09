import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import PageContainer from './components/PageContainer'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import { AuthProvider } from './contexts/AuthContext'
import AuthPage from './AuthPage'
import './theme.css'
import LandingPage from './pages/LandingPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminEventsPage from './pages/AdminEventsPage'
import EventDetailPage from './pages/EventDetailPage'
import EventTicketPage from './pages/EventTicketPage'
import EventsCalendarPage from './pages/EventsCalendarPage'
import EventsPage from './pages/EventsPage'
import FacultyCheckInPage from './pages/FacultyCheckInPage'
import FacultyDashboardPage from './pages/FacultyDashboardPage'
import FacultyEventFormPage from './pages/FacultyEventFormPage'
import FacultyEventsPage from './pages/FacultyEventsPage'
import FacultyRegistrationsPage from './pages/FacultyRegistrationsPage'
import MyEventsPage from './pages/MyEventsPage'
import ProfilePage from './pages/ProfilePage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import Phase10Header from './components/Phase10Header'

type ThemeMode = 'light' | 'dark'

const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const ResourceDetailPage = lazy(() => import('./pages/ResourceDetailPage'))
const SavedResourcesPage = lazy(() => import('./pages/SavedResourcesPage'))
const FacultyResourcesPage = lazy(() => import('./pages/FacultyResourcesPage'))
const ResourceUploadPage = lazy(() => import('./pages/ResourceUploadPage'))
const AdminResourcesPage = lazy(() => import('./pages/AdminResourcesPage'))
const AdminSubjectsPage = lazy(() => import('./pages/AdminSubjectsPage'))
const InternshipsPage = lazy(() => import('./pages/InternshipsPage'))
const InternshipDetailPage = lazy(() => import('./pages/InternshipDetailPage'))
const SavedInternshipsPage = lazy(() => import('./pages/SavedInternshipsPage'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'))
const CareerDashboardPage = lazy(() => import('./pages/CareerDashboardPage'))
const CareerProfilePage = lazy(() => import('./pages/CareerProfilePage'))
const FacultyInternshipsPage = lazy(() => import('./pages/FacultyInternshipsPage'))
const InternshipFormPage = lazy(() => import('./pages/InternshipFormPage'))
const AdminInternshipsPage = lazy(() => import('./pages/AdminInternshipsPage'))
const AdminCompaniesPage = lazy(() => import('./pages/AdminCompaniesPage'))
const ClubsPage = lazy(() => import('./pages/ClubsPage'))
const ClubDetailPage = lazy(() => import('./pages/ClubDetailPage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))
const TeamFormPage = lazy(() => import('./pages/TeamFormPage'))
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const AIWorkspace = lazy(() => import('./pages/AIWorkspacePage'))
const AdminAIAnalytics = lazy(() => import('./pages/AIWorkspacePage').then((module) => ({ default: module.AdminAIAnalyticsPage })))
const AcademicsPage = lazy(() => import('./pages/AcademicPages').then((module) => ({ default: module.AcademicsPage })))
const AcademicSubjectDetailPage = lazy(() => import('./pages/AcademicPages').then((module) => ({ default: module.AcademicSubjectDetailPage })))
const TimetablePage = lazy(() => import('./pages/AcademicPages').then((module) => ({ default: module.TimetablePage })))
const AttendancePage = lazy(() => import('./pages/AcademicPages').then((module) => ({ default: module.AttendancePage })))
const FacultyAttendancePage = lazy(() => import('./pages/AcademicPages').then((module) => ({ default: module.FacultyAttendancePage })))
const AdminAcademicsPage = lazy(() => import('./pages/AcademicPages').then((module) => ({ default: module.AdminAcademicsPage })))
const SupportHomePage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.SupportHomePage })))
const LostFoundPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.LostFoundPage })))
const LostFoundReportPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.LostFoundReportPage })))
const LostFoundDetailPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.LostFoundDetailPage })))
const LostFoundAdminPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.LostFoundAdminPage })))
const MyLostFoundPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: () => <module.LostFoundPage ownOnly /> })))
const NewSupportTicketPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.NewSupportTicketPage })))
const MySupportTicketsPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.MySupportTicketsPage })))
const SupportTicketDetailPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.SupportTicketDetailPage })))
const FeedbackPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.FeedbackPage })))
const MyFeedbackPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.MyFeedbackPage })))
const AdminFeedbackPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.AdminFeedbackPage })))
const SupportFAQPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.SupportFAQPage })))
const CampusServicesPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.CampusServicesPage })))
const CampusServiceDetailPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.CampusServiceDetailPage })))
const AdminCampusServicesPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: () => <module.CampusServicesPage admin /> })))
const AdminSupportPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.AdminSupportPage })))
const FacultySupportPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: () => <module.AdminSupportPage faculty /> })))
const ServiceRequestPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.ServiceRequestPage })))
const MyServiceRequestsPage = lazy(() => import('./pages/SupportPages').then((module) => ({ default: module.MyServiceRequestsPage })))
const GlobalSearchPage = lazy(() => import('./pages/GlobalSearchPage'))
const NotificationCenterPage = lazy(() => import('./pages/NotificationPages').then((module) => ({ default: module.NotificationCenterPage })))
const NotificationPreferencesPage = lazy(() => import('./pages/NotificationPages').then((module) => ({ default: module.NotificationPreferencesPage })))
const AnnouncementListPage = lazy(() => import('./pages/AnnouncementPages').then((module) => ({ default: module.AnnouncementListPage })))
const AnnouncementDetailPage = lazy(() => import('./pages/AnnouncementPages').then((module) => ({ default: module.AnnouncementDetailPage })))
const AnnouncementEditorPage = lazy(() => import('./pages/AnnouncementPages').then((module) => ({ default: module.AnnouncementEditorPage })))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPages').then((module) => ({ default: module.AdminAnalyticsPage })))
const AuditLogPage = lazy(() => import('./pages/AdminAnalyticsPages').then((module) => ({ default: module.AuditLogPage })))

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem('campusconnect-theme')
    if (stored === 'light' || stored === 'dark') {
      return stored
    }

    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.setAttribute('data-theme', theme)
    window.localStorage.setItem('campusconnect-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <HashRouter>
      <AuthProvider>
        <Phase10Header />
        <Routes>
          <Route path="/" element={<LandingPage theme={theme} onToggleTheme={toggleTheme} />} />
          <Route path="/login" element={<AuthPage variant="login" />} />
          <Route path="/register" element={<AuthPage variant="register" />} />
          <Route path="/forgot-password" element={<AuthPage variant="forgot" />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/calendar" element={<EventsCalendarPage />} />
          <Route path="/events/tickets/:ticketId" element={<EventTicketPage />} />
          <Route path="/clubs" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="community-loading">Loading clubs...</div>}><ClubsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/clubs/:clubId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="community-loading">Loading club...</div>}><ClubDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/teams" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="community-loading">Loading teams...</div>}><TeamsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/teams/create" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="community-loading">Loading team form...</div>}><TeamFormPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/teams/:teamId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="community-loading">Loading team...</div>}><TeamDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/chat" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="community-loading">Loading chat...</div>}><ChatPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/internships" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="career-loading">Loading Career Hub...</div>}><InternshipsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/internships/:internshipId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="career-loading">Loading opportunity...</div>}><InternshipDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/internships/saved" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="career-loading">Loading saved opportunities...</div>}><SavedInternshipsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/internships/applications" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="career-loading">Loading applications...</div>}><ApplicationsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/internships/applications/:applicationId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="career-loading">Loading application...</div>}><ApplicationDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/career-dashboard" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="career-loading">Loading career dashboard...</div>}><CareerDashboardPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/career-profile" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="career-loading">Loading career profile...</div>}><CareerProfilePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/resources" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading resource library...</div>}><ResourcesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/resources/:resourceId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading resource...</div>}><ResourceDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/resources/saved" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="resource-route-loading">Loading saved resources...</div>}><SavedResourcesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/my-events" element={<ProtectedRoute />}>
            <Route index element={<MyEventsPage />} />
          </Route>
          <Route path="/faculty/events" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><FacultyEventsPage /></RoleRoute>} />
          </Route>
          <Route path="/faculty/events/create" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><FacultyEventFormPage /></RoleRoute>} />
          </Route>
          <Route path="/faculty/events/:eventId/edit" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><FacultyEventFormPage /></RoleRoute>} />
          </Route>
          <Route path="/faculty/events/:eventId/registrations" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><FacultyRegistrationsPage /></RoleRoute>} />
          </Route>
          <Route path="/faculty/events/:eventId/check-in" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><FacultyCheckInPage /></RoleRoute>} />
          </Route>
          <Route path="/admin/events" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><AdminEventsPage /></RoleRoute>} />
          </Route>
          <Route path="/faculty/resources" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading faculty resources...</div>}><FacultyResourcesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/resources/upload" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading upload form...</div>}><ResourceUploadPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/resources/:resourceId/edit" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading resource...</div>}><ResourceUploadPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/internships" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><Suspense fallback={<div className="career-loading">Loading submissions...</div>}><FacultyInternshipsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/internships/create" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><Suspense fallback={<div className="career-loading">Loading submission form...</div>}><InternshipFormPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/internships/:internshipId/edit" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty', 'admin']}><Suspense fallback={<div className="career-loading">Loading submission...</div>}><InternshipFormPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/resources" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading resource management...</div>}><AdminResourcesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/resources/:resourceId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading resource...</div>}><ResourceDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/subjects" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading catalog...</div>}><AdminSubjectsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/internships" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="career-loading">Loading internship management...</div>}><AdminInternshipsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/internships/create" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="career-loading">Loading opportunity form...</div>}><InternshipFormPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/internships/:internshipId/edit" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="career-loading">Loading internship editor...</div>}><InternshipFormPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/companies" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="career-loading">Loading companies...</div>}><AdminCompaniesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/community" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="community-loading">Loading community moderation...</div>}><ClubsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/support" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading support center…</div>}><SupportHomePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/support/complaints/new" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading request form…</div>}><NewSupportTicketPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/support/complaints/:complaintId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading request…</div>}><SupportTicketDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/support/my-complaints" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading requests…</div>}><MySupportTicketsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/support/complaints" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading requests…</div>}><MySupportTicketsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/support/faq" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading FAQs…</div>}><SupportFAQPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/lost-found" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading listings…</div>}><LostFoundPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/lost-found/report-lost" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading report form…</div>}><LostFoundReportPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/lost-found/report-found" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading report form…</div>}><LostFoundReportPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/lost-found/my-reports" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading reports…</div>}><MyLostFoundPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/lost-found/:itemId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading report…</div>}><LostFoundDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/feedback" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading feedback…</div>}><FeedbackPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/feedback/new" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading feedback form…</div>}><FeedbackPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/feedback/my-feedback" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading your feedback…</div>}><MyFeedbackPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/campus-services" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading campus services…</div>}><CampusServicesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/campus-services/:serviceId/request" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading service request…</div>}><ServiceRequestPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/my-service-requests" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading requests…</div>}><MyServiceRequestsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/campus-services/:serviceId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="support-empty">Loading service…</div>}><CampusServiceDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/support" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="support-empty">Loading case management…</div>}><AdminSupportPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/complaints" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="support-empty">Loading complaints…</div>}><AdminSupportPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/complaints/:complaintId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="support-empty">Loading case…</div>}><SupportTicketDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/lost-found" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="support-empty">Loading Lost & Found review…</div>}><LostFoundAdminPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/feedback" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="support-empty">Loading feedback review…</div>}><AdminFeedbackPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/campus-services" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="support-empty">Loading services…</div>}><AdminCampusServicesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/support" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty']}><Suspense fallback={<div className="support-empty">Loading assigned cases…</div>}><FacultySupportPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/academics" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="resource-route-loading">Loading subjects…</div>}><AcademicsPage /></Suspense></RoleRoute>} />
            <Route path="subjects/:subjectId" element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="resource-route-loading">Loading subject…</div>}><AcademicSubjectDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/timetable" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading timetable…</div>}><TimetablePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/attendance" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student']}><Suspense fallback={<div className="resource-route-loading">Loading attendance…</div>}><AttendancePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/academics" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty']}><Suspense fallback={<div className="resource-route-loading">Loading faculty attendance…</div>}><FacultyAttendancePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/attendance" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty']}><Suspense fallback={<div className="resource-route-loading">Loading attendance…</div>}><FacultyAttendancePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/faculty/timetable" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['faculty']}><Suspense fallback={<div className="resource-route-loading">Loading timetable…</div>}><TimetablePage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/academics" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading academic operations…</div>}><AdminAcademicsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/search" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Searching campus content…</div>}><GlobalSearchPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/search/:category" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Searching campus content…</div>}><GlobalSearchPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/notifications" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading notifications…</div>}><NotificationCenterPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/settings/notifications" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading preferences…</div>}><NotificationPreferencesPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/announcements" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading announcements…</div>}><AnnouncementListPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/announcements/:announcementId" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="resource-route-loading">Loading announcement…</div>}><AnnouncementDetailPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/announcements" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading announcement management…</div>}><AnnouncementListPage admin /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/announcements/create" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading publisher…</div>}><AnnouncementEditorPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/announcements/:announcementId/edit" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading announcement editor…</div>}><AnnouncementEditorPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/analytics" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading campus analytics…</div>}><AdminAnalyticsPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/audit-logs" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="resource-route-loading">Loading audit logs…</div>}><AuditLogPage /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/messages" element={<PlaceholderPage title="Messages" />} />
          <Route path="/ai" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Opening your AI workspace…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="study-planner" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading study planner…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="quiz" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading quiz generator…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="notes" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading notes generator…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="summarizer" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading summarizer…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="career" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading career advisor…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="career-roadmap" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading career roadmap…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="interview" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading interview practice…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="project" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading project assistant…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="search" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading campus search…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
            <Route path="saved" element={<RoleRoute allowedRoles={['student', 'faculty', 'admin']}><Suspense fallback={<div className="ai-loading">Loading saved AI content…</div>}><AIWorkspace /></Suspense></RoleRoute>} />
          </Route>
          <Route path="/admin/ai" element={<ProtectedRoute />}>
            <Route index element={<RoleRoute allowedRoles={['admin']}><Suspense fallback={<div className="ai-loading">Loading AI analytics…</div>}><AdminAIAnalytics /></Suspense></RoleRoute>} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/student/dashboard" element={<RoleRoute allowedRoles={['student']}><StudentDashboardPage /></RoleRoute>} />
            <Route path="/faculty/dashboard" element={<RoleRoute allowedRoles={['faculty']}><FacultyDashboardPage /></RoleRoute>} />
            <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <PageContainer className="placeholder-shell">
      <div className="placeholder-card">
        <div className="brand-mark large" aria-hidden="true">
          <div className="brand-mark-core" />
        </div>
        <h1>{title}</h1>
        <p>This module is reserved for the next phase of the CampusConnect AI product build.</p>
        <Link to="/" className="primary-link">
          Back to home <ArrowRight size={16} />
        </Link>
      </div>
    </PageContainer>
  )
}

export default App
