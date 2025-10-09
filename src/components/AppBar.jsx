import React from 'react';
import { Link } from 'react-router-dom';

function AppBar({ title = 'BlockHunt' }) {
  return (
    <div className="appbar py-2">
      <div className="container d-flex align-items-center justify-content-between">
        <div className="brand">{title}</div>
        <div className="d-flex gap-2">
          <Link className="btn btn-ghost btn-sm" to="/challenges">
            <i className="bi bi-list-task"></i>
          </Link>
          <Link className="btn btn-ghost btn-sm" to="/profile">
            <i className="bi bi-person"></i>
          </Link>
          <Link className="btn btn-brand btn-sm" to="/studio">
            <i className="bi bi-code-slash"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AppBar;

