import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db 
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import WelcomeScreen from './components/WelcomeScreen';
import MainWorkspace from './components/MainWorkspace';
import IntroExperience from './components/IntroExperience';
import { RefreshCw, ShieldAlert, Lock, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const introSeen = localStorage.getItem('dataai_intro_seen');
      return !introSeen;
    }
    return false;
  });

  // Administrative Security Lockout Flag
  // Set to true to comply with user's urgent request to disable live server and link accessibility for security reasons.
  const isSecurityHoldActive = false;

  useEffect(() => {
    if (isSecurityHoldActive) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // Create user document if it doesn't exist
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              role: 'user',
              createdAt: new Date()
            });
          }
        } catch (e) {
          console.error("Firestore user verification error:", e);
        }

        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSecurityHoldActive]);

  // Global activity logger callback for subcomponents
  const handleLogUserActivity = async (action: string, details: string) => {
    if (!currentUser) return;
    try {
      const activityId = `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, 'activities', activityId), {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        actionType: action,
        details,
        timestamp: new Date()
      });
    } catch (e) {
      console.error('Error logging user activity:', e);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await handleLogUserActivity('LOGOUT', 'User signed out from system portal.');
    }
    await signOut(auth);
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
  };

  // 1. Render Security Hold screen if lock is active
  if (isSecurityHoldActive) {
    return (
      <div className="min-h-screen bg-[#05070f] text-slate-200 flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
        {/* Subtle red background alert blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-900/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-rose-500/20 rounded-2xl p-8 text-center shadow-2xl relative"
        >
          {/* Lock Header Graphic */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500">
                <Lock className="w-8 h-8 animate-pulse" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 p-1 bg-amber-500 text-slate-950 rounded-lg shadow border border-slate-900">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <h1 className="text-xl font-black tracking-tight text-white font-header">
            Portal Access Suspended
          </h1>
          <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mt-1.5">
            Security Isolation Hold Active
          </p>

          <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl text-left space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              At the request of the primary system administrator, access to the database connection, Gemini AI services, and user portals has been **deactivated and isolated**.
            </p>
            <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-2.5 flex items-center justify-between">
              <span>Status: Offline</span>
              <span>Ref: SEC-LOCK-77</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-6 leading-normal">
            If you are the administrator, you can safely lift this security block at any time via your next conversational request to the system agent.
          </p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060e] text-slate-200 flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold font-header text-2xl shadow-xl shadow-indigo-500/20 animate-pulse">
          D
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Synchronizing portal authentication matrix...</span>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {showIntro ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.75, ease: 'easeInOut' }}
          className="min-h-screen w-full bg-[#02040a]"
        >
          <IntroExperience onComplete={() => setShowIntro(false)} />
        </motion.div>
      ) : !currentUser ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="min-h-screen w-full"
        >
          <WelcomeScreen 
            onLoginSuccess={handleLoginSuccess} 
            onReplayIntro={() => setShowIntro(true)} 
          />
        </motion.div>
      ) : (
        <motion.div
          key="workspace"
          initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="min-h-screen w-full"
        >
          <MainWorkspace 
            currentUserEmail={currentUser.email || ''} 
            onLogout={handleLogout}
            onLogActivity={handleLogUserActivity}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
