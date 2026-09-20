import { Link } from 'react-router-dom'
import { navItems, site } from '../data/site'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="brand">
            <img className="brand-mark" src="/logo.png" alt="tescgsm" width={44} height={44} />
            <span className="wordmark">{site.name}</span>
          </p>
          <p className="muted">{site.tagline} · {site.location}</p>
        </div>

        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="footer-contact">
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <p className="muted">Batteries and LCD for phone repair. More parts later.</p>
        </div>
      </div>
    </footer>
  )
}
