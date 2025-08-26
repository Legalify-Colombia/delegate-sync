import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import SecretaryGeneralDashboard from '@/components/dashboards/SecretaryGeneralDashboard';
import CommitteeSecretaryDashboard from '@/components/dashboards/CommitteeSecretaryDashboard';
import CommunicationsSecretaryDashboard from '@/components/dashboards/CommunicationsSecretaryDashboard';
import DelegateDashboard from '@/components/dashboards/DelegateDashboard';
import StaffDashboard from '@/components/dashboards/StaffDashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return <LoadingSpinner />;
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'secretary_general':
        return <SecretaryGeneralDashboard />;
      case 'committee_secretary':
        return <CommitteeSecretaryDashboard />;
      case 'communications_secretary':
        return <CommunicationsSecretaryDashboard />;
      case 'delegate':
        return <DelegateDashboard />;
      case 'staff':
      case 'press':
        return <StaffDashboard />;
      default:
        return <div>Rol no reconocido</div>;
    }
  };

  return <>{renderDashboard()}</>;
}