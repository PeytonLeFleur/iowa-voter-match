import { NavLink, Outlet } from 'react-router'

export default function Layout() {
  return (
    <div className="shell">
      <header className="site-header">
        <NavLink to="/" className="brand">Iowa Voter Match</NavLink>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Independent, nonpartisan voter tool. Not affiliated with any campaign.</p>
      </footer>
    </div>
  )
}
