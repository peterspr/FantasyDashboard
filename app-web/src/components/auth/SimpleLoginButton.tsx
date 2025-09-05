"use client";

import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export function SimpleLoginButton() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Wait for Google to load and initialize
  useEffect(() => {
    const checkGoogle = () => {
      if (window.google?.accounts?.id) {
        setGoogleLoaded(true);
        initializeGoogle();
      } else {
        setTimeout(checkGoogle, 100);
      }
    };
    checkGoogle();
  }, []);

  const initializeGoogle = () => {
    if (!window.google?.accounts?.id || !buttonRef.current) return;

    // Initialize Google Identity Services with FedCM support
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: handleGoogleResponse,
      auto_select: false,
      use_fedcm_for_prompt: true,
      use_fedcm_for_button: true,
    });

    // Render the Google Sign-in button
    window.google.accounts.id.renderButton(
      buttonRef.current,
      {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 240,
        use_fedcm_for_button: true,
      }
    );
    
    console.log('Google Identity Services initialized with FedCM support');
  };

  const handleGoogleResponse = async (response: any) => {
    console.log('Google response received');
    setIsLoginLoading(true);
    
    try {
      await login(response.credential);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
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

  // Show loading state or Google button container
  if (isLoginLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-pulse text-sm text-gray-600">Signing in...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {!googleLoaded ? (
        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-md">
          <span className="text-sm">Loading Google...</span>
        </div>
      ) : (
        <div ref={buttonRef} className="google-signin-button" />
      )}
    </div>
  );
}

// Google Identity Services types with FedCM support
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: IdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
          prompt: (momentListener?: (promptMomentNotification: PromptMomentNotification) => void) => void;
        };
      };
    };
  }
}

interface IdConfiguration {
  client_id: string;
  auto_select?: boolean;
  callback: (handleCredentialResponse: CredentialResponse) => void;
  login_uri?: string;
  native_callback?: (response: CredentialResponse) => void;
  cancel_on_tap_outside?: boolean;
  prompt_parent_id?: string;
  nonce?: string;
  context?: string;
  state_cookie_domain?: string;
  ux_mode?: string;
  allowed_parent_origin?: string | string[];
  intermediate_iframe_close_callback?: () => void;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
  use_fedcm_for_button?: boolean;
}

interface CredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

interface GsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: string;
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  locale?: string;
  click_listener?: () => void;
  use_fedcm_for_button?: boolean;
}

interface PromptMomentNotification {
  getMomentType: () => string;
  getDismissedReason: () => string;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
}