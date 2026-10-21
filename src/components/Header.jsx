import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // -----------------------------------------
  // LOAD CURRENT LOGGED-IN USER
  // -----------------------------------------

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoadingProfile(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            "Error getting authenticated user:",
            userError
          );
          return;
        }

        if (!user) {
          setUserProfile(null);
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("user_id, full_name, email, role, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "Error loading user profile:",
            error
          );
          return;
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
        console.error(
          "Header profile error:",
          err
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []);

  // -----------------------------------------
  // LOGOUT
  // -----------------------------------------

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    navigate("/login");
  };

  // -----------------------------------------
  // BACK
  // -----------------------------------------

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (location.pathname.startsWith("/supervisor")) {
      navigate("/supervisor");
      return;
    }

    navigate("/contractor");
  };

  // -----------------------------------------
  // PROFILE DISPLAY VALUES
  // -----------------------------------------

  const displayName =
    loadingProfile
      ? "Loading..."
      : userProfile?.full_name || "User";

  const displayRole =
    loadingProfile
      ? ""
      : userProfile?.role || "User";

  return (
    <header className="site-header">
      <div className="header-container">

        {/* LOGO */}

        <div className="logo-section">

          <div className="logo-icon">
            S
          </div>

          <div className="logo-text">

            <h2>
              SiteSphere
            </h2>

            <span>
              Construction ERP
            </span>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="navigation">

          <button
            type="button"
            className="header-back-button"
            onClick={handleBack}
          >
            ← Back
          </button>

          <a href="/">
            Dashboard
          </a>

          <a href="/projects">
            Projects
          </a>

          <a href="/users">
            Users
          </a>

          <a href="/material-requests">
            Material Requests
          </a>

          <a href="/materials">
            Materials
          </a>

          <a href="/reports">
            Reports
          </a>

        </nav>

        {/* USER SECTION */}

        <div className="user-section">

          <button
            type="button"
            className="notification-btn"
          >
            🔔
          </button>

          <div className="profile">

            <div className="profile-avatar">
              {displayName
                ? displayName
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div className="profile-info">

              <strong>
                {displayName}
              </strong>

              <span>
                {displayRole}
              </span>

            </div>

          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </div>
    </header>
  );
};

export default Header;