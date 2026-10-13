import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            // Remove corrupted/expired token
            logout();
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser({ _id: data._id, username: data.username, email: data.email });
    return data;
  };

  const register = async (username, email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser({ _id: data._id, username: data.username, email: data.email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};
