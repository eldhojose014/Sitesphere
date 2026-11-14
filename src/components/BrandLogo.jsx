import logoFull from "../assets/sitesphere-logo.png";
import logoSmall from "../assets/sitesphere-logo-small.png";
import logoEmblem from "../assets/sitesphere-emblem.png";
import "./BrandLogo.css";

/**
 * SiteSphere logo.
 *  variant="full"   -> complete logo with wordmark and tagline (login / hero areas)
 *  variant="header" -> emblem + live text wordmark (compact, for top bars)
 *  variant="emblem" -> emblem only
 */
function BrandLogo({ variant = "full", className = "" }) {
  if (variant === "header") {
    return (
      <span className={`brand-logo brand-logo--header ${className}`}>
        <img
          className="brand-logo__emblem"
          src={logoEmblem}
          alt=""
          aria-hidden="true"
        />
        <span className="brand-logo__text">
          <span className="brand-logo__name">
            <span className="brand-logo__site">Site</span>
            <span className="brand-logo__sphere">Sphere</span>
          </span>
          <span className="brand-logo__tag">Construction ERP System</span>
        </span>
      </span>
    );
  }

  if (variant === "emblem") {
    return (
      <img
        className={`brand-logo brand-logo--emblem ${className}`}
        src={logoEmblem}
        alt="SiteSphere"
      />
    );
  }

  return (
    <img
      className={`brand-logo brand-logo--full ${className}`}
      src={logoFull}
      srcSet={`${logoSmall} 420w, ${logoFull} 900w`}
      sizes="(max-width: 600px) 220px, 300px"
      alt="SiteSphere - Construction ERP System. Plan, Manage, Build, Together."
    />
  );
}

export default BrandLogo;
