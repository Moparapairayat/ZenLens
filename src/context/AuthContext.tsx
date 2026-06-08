/**
 * Auth Context
 * Manages app lock state, PIN verification, and biometric enrollment
 */
import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

export interface AuthState {
  isLocked: boolean;
  isPINSet: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  lastActivityTime: number;
}

type AuthAction =
  | { type: 'SET_LOCKED'; payload: boolean }
  | { type: 'SET_PIN_SET'; payload: boolean }
  | { type: 'SET_BIOMETRIC_AVAILABLE'; payload: boolean }
  | { type: 'SET_BIOMETRIC_ENABLED'; payload: boolean }
  | { type: 'UPDATE_ACTIVITY' };

interface AuthContextType extends AuthState {
  lockApp: () => void;
  unlockApp: () => void;
  dispatch: React.Dispatch<AuthAction>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  isLocked: true,
  isPINSet: false,
  isBiometricAvailable: false,
  isBiometricEnabled: false,
  lastActivityTime: Date.now(),
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOCKED':
      return { ...state, isLocked: action.payload };
    case 'SET_PIN_SET':
      return { ...state, isPINSet: action.payload };
    case 'SET_BIOMETRIC_AVAILABLE':
      return { ...state, isBiometricAvailable: action.payload };
    case 'SET_BIOMETRIC_ENABLED':
      return { ...state, isBiometricEnabled: action.payload };
    case 'UPDATE_ACTIVITY':
      return { ...state, lastActivityTime: Date.now() };
    default:
      return state;
  }
}

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const lockApp = useCallback(() => {
    dispatch({ type: 'SET_LOCKED', payload: true });
  }, []);

  const unlockApp = useCallback(() => {
    dispatch({ type: 'SET_LOCKED', payload: false });
  }, []);

  const value: AuthContextType = {
    ...state,
    lockApp,
    unlockApp,
    dispatch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
