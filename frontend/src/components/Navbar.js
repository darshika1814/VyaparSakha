import React from 'react'
import {Link, useNavigate} from 'react-router-dom';
import '../design/navbar.css';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, shopkeeper, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
        <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid">
            <img src="https://cdn1.vectorstock.com/i/1000x1000/62/80/calculator-accounting-logo-flat-style-vector-22606280.jpg" alt="Logo" className="rounded-circle img-thumbnail" style={{width: 50, height: 50}}/>

                <Link className="navbar-brand" to="/">VyparSakha</Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
                    <div className="navbar-nav w-100">
                        <Link className="nav-link active" aria-current="page" to="/">Home</Link>
                        {isAuthenticated && (
                          <>
                            <Link className="nav-link mx-1" to="/city">City</Link>
                            <Link className="nav-link mx-1" to="/accounts">Account's</Link>
                            <Link className="nav-link mx-1" to="/bills">Generate Invoices</Link>
                            <Link className="nav-link mx-1" to="/report">Yearly Report</Link>
                          </>
                        )}
                        <Link className="nav-link mx-1" to="/about">About-Us</Link>

                        <div className="ms-lg-auto d-flex align-items-center">
                          {isAuthenticated ? (
                            <>
                              <span className="navbar-text mx-2">{shopkeeper?.shopName}</span>
                              <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>Logout</button>
                            </>
                          ) : (
                            <>
                              <Link className="nav-link mx-1" to="/login">Login</Link>
                              <Link className="btn btn-primary btn-sm mx-1" to="/register">Register</Link>
                            </>
                          )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    </div>
  )
}
