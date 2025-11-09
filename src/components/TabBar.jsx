import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function TabBar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="tabbar" aria-label="Bottom Tabs">
      <Link className={`tab ${isActive('/')}`} to="/">
        <i className="bi bi-house"></i>
        <span className="label">Home</span>
      </Link>
      <Link className={`tab ${isActive('/challenges')}`} to="/challenges">
        <i className="bi bi-list-task"></i>
        <span className="label">Challenges</span>
      </Link>
      <Link className={`tab ${isActive('/studio')}`} to="/studio">
        <i className="bi bi-code-slash"></i>
        <span className="label">Studio</span>
      </Link>
      <Link className={`tab ${isActive('/profile')}`} to="/profile">
        <i className="bi bi-person"></i>
        <span className="label">Profile</span>
      </Link>
    </nav>
  );
}

export default TabBar;

