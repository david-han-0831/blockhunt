import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Challenges from './pages/Challenges';
import Studio from './pages/Studio';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

function AppRoutes() {
  const { currentUser } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          currentUser ? 
            <Navigate to="/challenges" replace /> : 
            <Navigate to="/login" replace />
        } 
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/challenges" element={
        <ProtectedRoute>
          <Challenges />
        </ProtectedRoute>
      } />
      <Route path="/studio" element={
        <ProtectedRoute>
          <Studio />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <Admin />
        </AdminProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
