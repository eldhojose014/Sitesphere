import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">
            <BrandLogo variant="header" />
          </div>

          <p>
            A centralized construction ERP system for managing manpower,
            money, materials, projects and operations.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-column">
          <h3>Quick Links</h3>

          <Link to="/">Dashboard</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/materials">Materials</Link>
          <Link to="/building-plans">Building Plans</Link>
        </div>

        {/* Modules */}
        <div className="footer-column">
          <h3>Modules</h3>

          <Link to="/labours">Labour Management</Link>
          <Link to="/attendance">Attendance</Link>
          <Link to="/material-requests">Procurement</Link>
          <Link to="/finance-requests">Financial Requests</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} SiteSphere. All rights reserved.</p>

        <p>Plan · Manage · Build · Together</p>
      </div>
    </footer>
  );
};

export default Footer;
