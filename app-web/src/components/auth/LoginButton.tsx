"use client";

import React, { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export function LoginButton() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (typeof window === 'undefined') {
      console.error('Window object not available');
      return;
    }

    // Wait for Google Identity Services to load
    let attempts = 0;
    while (!window.google?.accounts?.id && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.google?.accounts?.id) {
      console.error('Google Identity Services not loaded after waiting');
      return;
    }

    setIsLoginLoading(true);
    
    try {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: any) => {
          try {
            console.log('Google ID token received:', response.credential ? 'Present' : 'Missing');
            await login(response.credential); // This is the ID token
          } catch (error) {
            console.error('Login failed:', error);
          } finally {
            setIsLoginLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Try to render the button instead of using prompt()
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'outline', 
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
        }
      );
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="w-20 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-900">{user.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    );
  }

  // Initialize Google button on component mount
  React.useEffect(() => {
    if (!isLoginLoading) {
      handleGoogleLogin();
    }
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {/* Google-rendered button */}
      <div id="google-signin-button" style={{ display: 'inline-block' }}></div>
      
      {/* Fallback button */}
      <button
        onClick={() => {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
          } else {
            handleGoogleLogin();
          }
        }}
        disabled={isLoginLoading}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors ml-2"
        style={{ display: isLoginLoading ? 'flex' : 'none' }}
      >
        <LogIn className="w-4 h-4" />
        <span>{isLoginLoading ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
    </div>
  );
}

// Add Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
        };
      };
    };
  }
}