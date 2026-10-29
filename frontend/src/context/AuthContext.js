import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY, SHOPKEEPER_KEY } from '../api';

const AuthContext = createContext(null);

function readStoredShopkeeper() {
    try {
        return JSON.parse(localStorage.getItem(SHOPKEEPER_KEY));
    } catch (error) {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [shopkeeper, setShopkeeper] = useState(readStoredShopkeeper);
    const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

    const saveSession = useCallback((newToken, newShopkeeper) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(SHOPKEEPER_KEY, JSON.stringify(newShopkeeper));
        setToken(newToken);
        setShopkeeper(newShopkeeper);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SHOPKEEPER_KEY);
        // Drop per-customer selections from the previous session.
        ['name', 'mob', 'customerId', 'city-name', 'customer'].forEach((key) =>
            localStorage.removeItem(key)
        );
        setToken(null);
        setShopkeeper(null);
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        saveSession(data.token, data.shopkeeper);
    }, [saveSession]);

    const register = useCallback(async (details) => {
        const { data } = await api.post('/auth/register', details);
        saveSession(data.token, data.shopkeeper);
    }, [saveSession]);

    // On page load, confirm the stored token is still valid.
    useEffect(() => {
        let cancelled = false;

        if (!localStorage.getItem(TOKEN_KEY)) {
            setChecking(false);
            return undefined;
        }

        api.get('/auth/me')
            .then(({ data }) => {
                if (cancelled) return;
                localStorage.setItem(SHOPKEEPER_KEY, JSON.stringify(data.shopkeeper));
                setShopkeeper(data.shopkeeper);
            })
            .catch((error) => {
                if (cancelled) return;
                // Only a rejected token ends the session; a network blip does not.
                if (error.response?.status === 401) logout();
            })
            .finally(() => {
                if (!cancelled) setChecking(false);
            });

        return () => {
            cancelled = true;
        };
    }, [logout]);

    const value = useMemo(
        () => ({
            token,
            shopkeeper,
            isAuthenticated: Boolean(token),
            checking,
            login,
            register,
            logout
        }),
        [token, shopkeeper, checking, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used inside <AuthProvider>');
    }
    return context;
}
