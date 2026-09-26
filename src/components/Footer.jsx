import React from "react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">

      <div className="footer-container">

        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon">S</div>

            <div>
              <h2>SiteSphere</h2>
              <span>Construction ERP</span>
            </div>
          </div>

          <p>
            A centralized construction ERP system for managing
            manpower, money, materials, projects and operations.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-column">
          <h3>Quick Links</h3>

          <a href="/">Dashboard</a>
          <a href="/projects">Projects</a>
          <a href="/materials">Materials</a>
          <a href="/reports">Reports</a>
        </div>

        {/* Modules */}
        <div className="footer-column">
          <h3>Modules</h3>

          <a href="/labour">Labour Management</a>
          <a href="/inventory">Inventory</a>
          <a href="/procurement">Procurement</a>
          <a href="/finance">Financial Management</a>
        </div>

        {/* Support */}
        <div className="footer-column">
          <h3>Support</h3>

          <a href="/help">Help Center</a>
          <a href="/contact">Contact Us</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms & Conditions</a>
        </div>

      </div>

      <div className="footer-bottom">
        <p>
          © 2026 SiteSphere. All rights reserved.
        </p>

        <p>
          Construction Enterprise Resource Planning System
        </p>
      </div>

    </footer>
  );
};

export default Footer;