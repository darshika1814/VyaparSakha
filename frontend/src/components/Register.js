import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';

export default function Register() {
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        shopName: '',
        email: '',
        password: '',
        mobileno: '',
        address: '',
        gstin: ''
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/city" replace />;
    }

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await register(form);
            navigate('/city', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Unable to create the account. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const field = (name, label, props = {}) => (
        <div className="mb-3">
            <label htmlFor={name} className="form-label">{label}</label>
            <input
                className="form-control"
                id={name}
                name={name}
                value={form[name]}
                onChange={onChange}
                {...props}
            />
        </div>
    );

    return (
        <div className="container my-4" style={{ maxWidth: 520 }}>
            <div className="border rounded p-4">
                <h2 className="text-center mb-3" style={{ fontFamily: 'Recursive' }}>
                    Create Shop Account
                </h2>

                {error && <div className="alert alert-danger" role="alert">{error}</div>}

                <form onSubmit={onSubmit}>
                    {field('name', 'Your name', { type: 'text', required: true, autoComplete: 'name' })}
                    {field('shopName', 'Shop name', { type: 'text', required: true })}
                    {field('email', 'Email', { type: 'email', required: true, autoComplete: 'email' })}
                    {field('password', 'Password (at least 8 characters)', {
                        type: 'password',
                        required: true,
                        minLength: 8,
                        maxLength: 72,
                        autoComplete: 'new-password'
                    })}
                    {field('mobileno', 'Shop phone (optional, shown on invoices)', { type: 'tel' })}
                    {field('address', 'Shop address (optional, shown on invoices)', { type: 'text' })}
                    {field('gstin', 'GSTIN (optional, shown on invoices)', { type: 'text' })}

                    <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                        {submitting ? 'Creating account...' : 'Register'}
                    </button>
                </form>

                <p className="text-center mt-3 mb-0">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}
