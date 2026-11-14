import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ROLE_NAV, getHomeForRole } from "../lib/roles";
import BrandLogo from "./BrandLogo";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // -----------------------------------------
  // LOAD CURRENT LOGGED-IN USER
  // -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadUserProfile = async () => {
      setLoadingProfile(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          setUserProfile(null);
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("user_id, full_name, email, role, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Error loading user profile:", error);
        }

        if (data) {
          setUserProfile(data);
        } else {
          // Fallback to Supabase Auth information
          setUserProfile({
            user_id: user.id,
            full_name:
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "User",
            email: user.email || "",
            role: "User",
            status: "Active",
          });
        }
      } catch (err) {
        console.error("Header profile error:", err);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    loadUserProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // -----------------------------------------
  // ACTIONS
  // -----------------------------------------

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    navigate("/login", { replace: true });
  };

  const homePath = getHomeForRole(userProfile?.role);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(homePath);
  }, [navigate, homePath]);

  // -----------------------------------------
  // DISPLAY VALUES
  // -----------------------------------------

  const displayName = loadingProfile
    ? "Loading..."
    : userProfile?.full_name || "User";

  const displayRole = loadingProfile ? "" : userProfile?.role || "User";

  const navItems = ROLE_NAV[userProfile?.role] || [];

  const navLinks = navItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end
      className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
    >
      {item.label}
    </NavLink>
  ));

  return (
    <header className="site-header">
      <div className="header-container">
        {/* LOGO */}
        <NavLink
          to={homePath}
          className="logo-section"
          aria-label="SiteSphere home"
        >
          <BrandLogo variant="header" />
        </NavLink>

        {/* NAVIGATION (desktop) */}
        <nav className="navigation" aria-label="Main navigation">
          <button
            type="button"
            className="header-back-button"
            onClick={handleBack}
          >
            ← Back
          </button>

          {navLinks}
        </nav>

        {/* USER SECTION */}
        <div className="user-section">
          <div className="profile">
            <div className="profile-avatar">
              {displayName ? displayName.charAt(0).toUpperCase() : "U"}
            </div>

            <div className="profile-info">
              <strong>{displayName}</strong>
              <span>{displayRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

          <button
            type="button"
            className="menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* NAVIGATION (mobile) */}
      {menuOpen && (
        <nav className="mobile-navigation" aria-label="Mobile navigation">
          <button
            type="button"
            className="header-back-button"
            onClick={handleBack}
          >
            ← Back
          </button>

          {navLinks}

          <div className="mobile-user">
            <strong>{displayName}</strong>
            <span>{displayRole}</span>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
