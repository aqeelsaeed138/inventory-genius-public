import { ReactNode, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

const LOADING_TIMEOUT_MS = 10000; // 10 seconds max loading time

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, profileLoading } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (!loading && !profileLoading) {
      setTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (loading || profileLoading) {
        console.warn("ProtectedRoute: Loading timeout exceeded, redirecting to auth");
        setTimedOut(true);
      }
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [loading, profileLoading]);

  // If timed out, redirect to auth
  if (timedOut) {
    return <Navigate to="/auth" state={{ from: location, error: "session_timeout" }} replace />;
  }

  // Wait for both auth and profile to finish loading
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
