import React from "react";
import "./Header.css";

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-container">

        {/* Logo */}
        <div className="logo-section">
          <div className="logo-icon">S</div>
          <div className="logo-text">
            <h2>SiteSphere</h2>
            <span>Construction ERP</span>
          </div>
        </div>

        {/* Navigation */}
       <nav className="navigation">
          <a href="/">Dashboard</a>
          <a href="/projects">Projects</a>
          <a href="/users">Users</a>
          <a href="/material-requests">Material Requests</a>
          <a href="/materials">Materials</a>
          <a href="/reports">Reports</a>
        </nav>

        {/* User Section */}
        <div className="user-section">
          <button className="notification-btn">
            🔔
          </button>

          <div className="profile">
            <div className="profile-avatar">E</div>

            <div className="profile-info">
              <strong>Admin</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button className="logout-btn">
            Logout
          </button>
        </div>

      </div>
    </header>
  );
};

export default Header;