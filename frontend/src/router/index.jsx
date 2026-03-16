import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import PatientDashboardPage from '../pages/patient/DashboardPage'
import PatientJournalPage from '../pages/patient/JournalPage'
import PatientTasksPage from '../pages/patient/TasksPage'
import PatientSummaryPage from '../pages/patient/SummaryPage'
import PatientGroupPage from '../pages/patient/GroupPage'
import PatientInvitationsPage from '../pages/patient/InvitationsPage'
import TherapistDashboardPage from '../pages/therapist/DashboardPage'
import TherapistPatientsPage from '../pages/therapist/PatientsPage'
import TherapistPatientDetailPage from '../pages/therapist/PatientDetailPage'
import TherapistTasksPage from '../pages/therapist/TasksPage'
import TherapistGroupsPage from '../pages/therapist/GroupsPage'
import TherapistGroupDetailPage from '../pages/therapist/GroupDetailPage'
import TherapistAnalyticsPage from '../pages/therapist/AnalyticsPage'
import { PageWrapper } from '../components/layout/PageWrapper'

function ProtectedRoute({ children, role }) {
  const { accessToken, user } = useAuthStore()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (role && user?.role !== role) {
    const redirect = user?.role === 'patient' ? '/app/patient' : '/app/therapist'
    return <Navigate to={redirect} replace />
  }

  return children
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/app/patient',
    element: (
      <ProtectedRoute role="patient">
        <PageWrapper />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <PatientDashboardPage /> },
      { path: 'invitations', element: <PatientInvitationsPage /> },
      { path: 'journal', element: <PatientJournalPage /> },
      { path: 'tasks', element: <PatientTasksPage /> },
      { path: 'summary', element: <PatientSummaryPage /> },
      { path: 'groups/:id', element: <PatientGroupPage /> },
    ],
  },
  {
    path: '/app/therapist',
    element: (
      <ProtectedRoute role="therapist">
        <PageWrapper />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <TherapistDashboardPage /> },
      { path: 'patients', element: <TherapistPatientsPage /> },
      { path: 'patients/:linkId', element: <TherapistPatientDetailPage /> },
      { path: 'analytics/:patientId', element: <TherapistAnalyticsPage /> },
      { path: 'tasks', element: <TherapistTasksPage /> },
      { path: 'groups', element: <TherapistGroupsPage /> },
      { path: 'groups/:id', element: <TherapistGroupDetailPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
