import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">Discord Command Center</div>
      {isLoggedIn && (
        <div className="navbar-links">
          <Link to="/">Dashboard</Link>
          <Link to="/logs">Logs</Link>
          <Link to="/settings">Settings</Link>
          <button onClick={logout} className="link-button">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
