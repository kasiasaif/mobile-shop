import { Link } from 'react-router-dom'
import logoUrl from '../assets/logo.svg?url'
import { navItems, site } from '../data/site'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <Link className="brand" to="/">
          <img className="brand-mark" src={logoUrl} alt="tescgsm" width={36} height={36} />
          <span className="wordmark">{site.name}</span>
        </Link>

        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              {item.label}
            </Link>
          ))}
          <Link to="/terms">Terms and conditions</Link>
        </nav>

        <a className="footer-email" href={`mailto:${site.email}`}>
          {site.email}
        </a>

        <p className="footer-copy">© {new Date().getFullYear()} {site.name}</p>
      </div>
    </footer>
  )
}
