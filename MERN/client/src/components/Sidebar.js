import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <Link 
          to="/listings" 
          className={`nav-link ${location.pathname === '/listings' ? 'active' : ''}`}
        >
          Listings
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;

