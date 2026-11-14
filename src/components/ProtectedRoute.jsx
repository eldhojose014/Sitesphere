import { Navigate } from "react-router-dom";
import useCurrentUser from "../lib/useCurrentUser";
import { getHomeForRole } from "../lib/roles";

/**
 * Guards a page.
 *  - Not signed in / no active profile -> /login
 *  - allowedRoles given and the role is not in it -> that user's own dashboard
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { loading, authUser, profile } = useCurrentUser();

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Loading SiteSphere...
      </div>
    );
  }

  if (!authUser || !profile || profile.status !== "Active") {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getHomeForRole(profile.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
