import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface CloudAuthGatewayProps {
  parentOrigin: string;
}

export function CloudAuthGateway({ parentOrigin }: CloudAuthGatewayProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // If the window has no opener, we don't treat it as a blocking error anymore.
    // Instead, we fall back to redirecting web tokens back to parentOrigin.
    if (!window.opener && !parentOrigin) {
      setStatus('error');
      setErrorMessage("No parent or opener window detected, and no parentOrigin parameter was provided.");
    }
  }, [parentOrigin]);

  const handleAuthenticate = async () => {
    try {
      setStatus('loading');
      setErrorMessage('');
      
      // Perform genuine Google login Popup in this run.app window (where it is completely authorized in Firebase Console!)
      const result = await signInWithPopup(auth, googleProvider);
      
      if (!result?.user) {
        throw new Error("No Google credentials returned.");
      }

      // Extract genuine Google OAuth credentials
      const { GoogleAuthProvider: AuthProviderClass } = await import('firebase/auth');
      const googleCred = AuthProviderClass.credentialFromResult(result);
      const googleIdToken = googleCred?.idToken;
      const googleAccessToken = googleCred?.accessToken;

      // Retrieve secure JWT authentication ID token (Firebase project-specific fallback)
      const firebaseIdToken = await result.user.getIdToken();

      // Bundle credentials securely
      const authData = {
        type: 'DELEGATED_AUTH_SUCCESS',
        idToken: googleIdToken || firebaseIdToken, // compatibility fallback
        googleIdToken: googleIdToken || null,
        googleAccessToken: googleAccessToken || null,
        firebaseIdToken: firebaseIdToken
      };

      // Dispatch token securely to Vercel parent window (e.g., baby-pulse.vercel.app)
      if (window.opener) {
        try {
          window.opener.postMessage(authData, parentOrigin || '*');
          
          setStatus('success');
          // Close automatically after success display
          setTimeout(() => {
            window.close();
          }, 1500);
          return;
        } catch (postMessageErr) {
          console.warn("postMessage transmission failed, falling back to redirect:", postMessageErr);
        }
      }

      // Fallback for mobile tabs/non-opener browser states: Redirect back to the parent app with hash tokens
      if (parentOrigin) {
        setStatus('success');
        setTimeout(() => {
          // Send back via secure hash parameters so server never receives them (purely client-side)
          const params = new URLSearchParams();
          params.set('idToken', googleIdToken || firebaseIdToken || '');
          if (googleIdToken) params.set('googleIdToken', googleIdToken);
          if (googleAccessToken) params.set('googleAccessToken', googleAccessToken);
          if (firebaseIdToken) params.set('firebaseIdToken', firebaseIdToken);
          
          window.location.href = `${parentOrigin}/#${params.toString()}`;
        }, 1500);
      } else {
        throw new Error("Opener window was not found and parentOrigin parameter is missing.");
      }
    } catch (err: any) {
      console.error("Delegated Gateway Auth Error:", err);
      setStatus('error');
      setErrorMessage(err?.message || "Google Authentication failed. Please check your network credentials and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-neutral-800 dark:text-slate-100 font-sans selection:bg-sky-500/30">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-neutral-250/20 dark:border-slate-800/40 shadow-xl rounded-2xl p-8 space-y-6 text-center transition-all duration-300">
        
        {/* Brand / Title Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center text-sky-500 relative">
            <Shield className="h-7 w-7 animate-pulse text-sky-500" />
            <div className="absolute inset-0 rounded-2xl border border-sky-400 opacity-20 animate-ping"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              BabyPulse Cloud Gateway
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-sky-500 font-bold mt-1">
              Secure Auth Delegation
            </p>
          </div>
        </div>

        {/* Dynamic Status Display Card */}
        <div className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-neutral-100 dark:border-slate-800/25 space-y-3">
          {status === 'idle' && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed">
                Provide secure Google authorization to synchronization database for:
              </p>
              <div className="py-1 px-3 bg-neutral-100 dark:bg-slate-850 rounded-lg inline-block text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold max-w-full truncate">
                {parentOrigin || "Custom Host"}
              </div>
              <p className="text-[10px] text-neutral-450 dark:text-slate-500 leading-normal">
                This secure gateway transmits cryptographic cloud tokens back to your app to bypass browser sandboxing restrictions automatically.
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="py-4 flex flex-col items-center space-y-4">
              <div className="h-8 w-8 rounded-full border-[3px] border-sky-500 border-t-transparent animate-spin"></div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-800 dark:text-slate-200">
                  Securing Credentials...
                </p>
                <p className="text-[10px] text-neutral-400">
                  Completing Google Authentication & gathering token
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-3 flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  Sync Authorized Successfully!
                </p>
                <p className="text-[10px] text-neutral-400">
                  Transferring credentials & closing gateway window...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-2 space-y-3 flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Authorization Cancelled or Failed
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-relaxed max-w-xs break-words">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons / Actions */}
        <div className="space-y-2 pt-2">
          {status !== 'success' && (
            <button
              onClick={handleAuthenticate}
              disabled={status === 'loading'}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-sky-500 hover:bg-sky-600 active:scale-[98%] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/10"
            >
              <Shield className="h-4 w-4" />
              {status === 'loading' ? "Authorizing..." : "🔒 Authorize Cloud Sync"}
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={() => setStatus('idle')}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-[11px] text-neutral-500 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset & Try Again
            </button>
          )}

          <p className="text-[9px] text-neutral-400 dark:text-slate-500">
            Secure SSL Encryption • Standard Google Verification
          </p>
        </div>

      </div>
    </div>
  );
}
