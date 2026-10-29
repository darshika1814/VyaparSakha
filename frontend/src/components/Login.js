import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';

export default function Login() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || '/city';

    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(form.email, form.password);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Unable to log in. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container my-4" style={{ maxWidth: 460 }}>
            <div className="border rounded p-4">
                <h2 className="text-center mb-3" style={{ fontFamily: 'Recursive' }}>
                    Shopkeeper Login
                </h2>

                {error && <div className="alert alert-danger" role="alert">{error}</div>}

                <form onSubmit={onSubmit}>
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            id="email"
                            name="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            id="password"
                            name="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                        {submitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="text-center mt-3 mb-0">
                    New here? <Link to="/register">Create a shop account</Link>
                </p>
            </div>
        </div>
    );
}
