import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  auth, 
  db 
} from '../firebase';
import { 
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Database, ShieldCheck, Sparkles, RefreshCw, Play } from 'lucide-react';

interface WelcomeScreenProps {
  onLoginSuccess: (user: any, isAdmin: boolean) => void;
  onReplayIntro?: () => void;
}

export default function WelcomeScreen({ onLoginSuccess, onReplayIntro }: WelcomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const logUserActivity = async (userId: string, email: string, action: string, details: string) => {
    try {
      const activityId = `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, 'activities', activityId), {
        userId,
        userEmail: email,
        actionType: action,
        details,
        timestamp: new Date()
      });
    } catch (e) {
      console.error('Error logging user activity:', e);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user has admin privileges
      let userIsAdmin = false;
      if (user.email === 'admin@dataai.com' || user.email === 'mokshithgowda329@gmail.com') {
        userIsAdmin = true;
      }

      // Log successful Google sign-in activity
      await logUserActivity(user.uid, user.email || '', 'GOOGLE_LOGIN', `Logged in via Google secure single sign-on.`);
      onLoginSuccess(user, userIsAdmin);
    } catch (err: any) {
      console.error(err);
      let cleanMsg = err.message;
      if (err.code === 'auth/popup-closed-by-user') {
        cleanMsg = 'Google authentication popup was closed. Please try again.';
      } else if (err.code === 'auth/operation-not-allowed') {
        cleanMsg = 'Google sign-in is not enabled in your Firebase Console. Please enable the Google provider under Authentication -> Sign-in method.';
      }
      setError(cleanMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 select-none bg-slate-50 dark:bg-[#0a0e1a] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Background blobs */}
      <div className="bg-blobs">
        <div className="blob blob-purple"></div>
        <div className="blob blob-cyan"></div>
      </div>

      {/* Cybernetic code grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-panel p-8 md:p-12 z-10 relative shadow-2xl border-indigo-500/10 shadow-indigo-500/5 text-center"
      >
        {/* Futuristic Corner Bars */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-indigo-500 rounded-tl-lg" />
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-500 rounded-tr-lg" />
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-500 rounded-bl-lg" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-indigo-500 rounded-br-lg" />

        <div className="mb-8 flex flex-col items-center">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/20 mb-5"
          >
            <Database className="w-8 h-8 text-white animate-pulse" />
          </motion.div>
          
          <h1 className="text-4xl font-extrabold font-header tracking-tight text-gradient-purple-cyan">
            DataAI Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-sm mx-auto font-sans leading-relaxed">
            Cognitive predictions, high-speed custom visualization, and Gemini AI narrative intelligence.
          </p>
        </div>

        {/* SSO Security Information Banner */}
        <div className="mb-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-left space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Enforced Secure Single Sign-On (SSO)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            To guarantee absolute privacy and system integrity, we have migrated completely to secure Google Single Sign-On. Creating manual passwords is no longer required.
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 text-left">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic button wrapper */}
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 px-5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold shadow-md hover:shadow-indigo-500/5 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            )}
            <span>{loading ? 'Authenticating secure connection...' : 'Continue with Google'}</span>
          </motion.button>

          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Accounts are registered instantly upon Google sign-in.</span>
            </div>
            {onReplayIntro && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onReplayIntro}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-400/10 hover:border-indigo-500/20 rounded-lg text-[10px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wide uppercase transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Replay Cinematic Intro</span>
              </motion.button>
            )}
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800/60 leading-relaxed font-sans">
          This system is restricted to authorized credentials only. System actions and accesses are strictly monitored and audited.
        </div>
      </motion.div>
    </div>
  );
}
