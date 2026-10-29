import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Renders its children only for a logged-in shopkeeper.
export default function ProtectedRoute({ children }) {
    const { isAuthenticated, checking } = useAuth();
    const location = useLocation();

    if (checking) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}
