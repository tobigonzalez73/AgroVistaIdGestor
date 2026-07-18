import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/UserContext';

export default function ProtectedRoute() {
    const { currentUser, isLoadingAuth } = useAuth();


    if (isLoadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    // Only allow actual users (not guest/null)
    const isActuallyAuthenticated = (currentUser && currentUser.id !== 'guest');

    if (!isActuallyAuthenticated && !isLoadingAuth) {
        return <Navigate to="/login" replace />;
    }

    if (currentUser && !currentUser.isActive && !isLoadingAuth) {
        return <Navigate to="/pending" replace />;
    }

    return <Outlet />;
}
