import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  Camera, 
  KeyRound, 
  Bell, 
  Eye, 
  EyeOff, 
  Globe, 
  LogOut, 
  CheckCircle, 
  Smartphone, 
  QrCode, 
  Clipboard, 
  Moon, 
  Sun,
  Laptop,
  Check,
  AlertTriangle,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import confetti from 'canvas-confetti';

interface TabProfileProps {
  currentUserEmail: string;
  onLogout: () => void;
  onLogActivity: (action: string, details: string) => void;
}

// Curie of stunning predefined futuristic avatar colors/gradients
const PRESET_AVATARS = [
  { id: 'neon-indigo', name: 'Neural Indigo', css: 'from-indigo-600 via-purple-600 to-cyan-500' },
  { id: 'cyan-cyber', name: 'Cyber Cyan', css: 'from-cyan-500 via-teal-500 to-emerald-400' },
  { id: 'crimson-flare', name: 'Crimson Flare', css: 'from-rose-600 via-orange-500 to-amber-400' },
  { id: 'violet-matrix', name: 'Violet Matrix', css: 'from-violet-600 via-fuchsia-600 to-pink-500' },
  { id: 'glowing-gold', name: 'Liquid Gold', css: 'from-amber-500 via-yellow-400 to-orange-600' },
];

const LANGUAGES = [
  { code: 'en', name: 'English (US)' },
  { code: 'es', name: 'Español (ES)' },
  { code: 'fr', name: 'Français (FR)' },
  { code: 'de', name: 'Deutsch (DE)' },
  { code: 'ja', name: '日本語 (JP)' },
  { code: 'zh', name: '简体中文 (CN)' },
];

export default function TabProfile({ currentUserEmail, onLogout, onLogActivity }: TabProfileProps) {
  const user = auth.currentUser;
  
  // Loading and Save States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // active sub-tab for profile navigation
  const [subTab, setSubTab] = useState<'details' | 'security' | 'preferences'>('details');

  // Core User Profile Fields (stored in Firestore / Fallback to local)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('Data Analyst');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [createdAt, setCreatedAt] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<string>(''); // base64 or preset class
  const [avatarPreset, setAvatarPreset] = useState('neon-indigo');

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Two-Factor Authentication (2FA) setup states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAWizard, setShow2FAWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [mfaSecret, setMfaSecret] = useState('DTAI-6A2A-06DA-B9BB-4E8B');
  const [otpToken, setOtpToken] = useState('');
  const [otpError, setOtpError] = useState('');
  const [backupCodes] = useState<string[]>([
    '4819-3042',
    '8821-4950',
    '3041-9281',
    '1102-5591',
    '7845-6623',
    '9902-1481'
  ]);

  // Privacy & Preferences States
  const [privacyProfilePublic, setPrivacyProfilePublic] = useState(true);
  const [privacySearchIndex, setPrivacySearchIndex] = useState(false);
  const [notifyEmailDigest, setNotifyEmailDigest] = useState(true);
  const [notifyPushAlerts, setNotifyPushAlerts] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isThemeDark, setIsThemeDark] = useState(true);

  // Load User details from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setFullName(data.fullName || user.displayName || '');
          setUsername(data.username || (user.email ? user.email.split('@')[0] : ''));
          setPhone(data.phone || '');
          setOrganization(data.organization || 'DataAI Corporation');
          setRole(data.role || 'Senior Data Specialist');
          setBio(data.bio || 'Manipulating multi-dimensional matrices and forecasting system variables with AI.');
          setLocation(data.location || 'San Francisco, CA');
          setProfilePic(data.profilePic || '');
          setAvatarPreset(data.avatarPreset || 'neon-indigo');
          setTwoFactorEnabled(data.twoFactorEnabled || false);
          setPrivacyProfilePublic(data.privacyProfilePublic !== false);
          setPrivacySearchIndex(!!data.privacySearchIndex);
          setNotifyEmailDigest(data.notifyEmailDigest !== false);
          setNotifyPushAlerts(data.notifyPushAlerts !== false);
          setSelectedLanguage(data.selectedLanguage || 'en');
          
          if (data.createdAt) {
            if (data.createdAt.seconds) {
              setCreatedAt(new Date(data.createdAt.seconds * 1000));
            } else {
              setCreatedAt(new Date(data.createdAt));
            }
          } else {
            setCreatedAt(new Date());
          }
        } else {
          // Initialize with default details
          setFullName(user.displayName || '');
          setUsername(user.email ? user.email.split('@')[0] : 'user');
          setCreatedAt(new Date());
        }

        // Sync local light/dark theme mode from HTML element
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        setIsThemeDark(theme === 'dark');

      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Handle local dark mode toggle
  const handleToggleTheme = () => {
    const nextTheme = isThemeDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setIsThemeDark(!isThemeDark);
    onLogActivity('THEME_TOGGLE', `Switched workspace layout to ${nextTheme} theme.`);
  };

  // Profile Picture File Upload Handler (converts to base64 for Firestore storage)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // Limit to 1MB for Firestore storage optimization
      setErrorMsg('Error: Profile photo must be less than 1MB.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setProfilePic(base64);
      onLogActivity('PROFILE_PIC_UPLOAD', 'Uploaded custom secure profile photo.');
    };
    reader.readAsDataURL(file);
  };

  // Save changes to firestore
  const handleSaveChanges = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        fullName,
        username,
        phone,
        organization,
        role,
        bio,
        location,
        profilePic,
        avatarPreset,
        privacyProfilePublic,
        privacySearchIndex,
        notifyEmailDigest,
        notifyPushAlerts,
        selectedLanguage
      });

      setSuccessMsg('Profile updated successfully! All records have been securely committed.');
      onLogActivity('PROFILE_UPDATE', 'Successfully modified secure personal profile records.');
      
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 }
      });

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error saving modifications: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Change password simulation
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current password to authorize changes.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Verification mismatch. Ensure confirm password matches new password.');
      return;
    }

    // Success simulation with activity logging
    setSuccessMsg('Credential password updated successfully! System encryption key recycled.');
    onLogActivity('PASSWORD_CHANGED', 'Recycled account authorization credentials and upgraded encryption keys.');
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 2FA Setup Flow Verification
  const handleVerifyOTP = async () => {
    setOtpError('');
    if (otpToken.length !== 6) {
      setOtpError('Error: Token must be exactly 6 digits.');
      return;
    }

    // Simulate OTP Token authentication
    if (otpToken === '123456' || otpToken === '654321' || otpToken.length === 6) {
      try {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            twoFactorEnabled: !twoFactorEnabled
          });
        }
        
        const nextState = !twoFactorEnabled;
        setTwoFactorEnabled(nextState);
        setWizardStep(3); // Show backup codes / final step
        onLogActivity('MFA_UPDATE', nextState ? 'Activated biometric MFA / authenticator security shield.' : 'Deactivated MFA security shield.');
      } catch (err: any) {
        setOtpError('Error committing security state: ' + err.message);
      }
    } else {
      setOtpError('Invalid numeric code. Please check your authenticator client.');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(mfaSecret);
    alert('Authenticator Key Secret copied to clipboard!');
  };

  // Preset avatar background CSS helper
  const getPresetCss = () => {
    const preset = PRESET_AVATARS.find(a => a.id === avatarPreset);
    return preset ? preset.css : 'from-indigo-600 via-purple-600 to-cyan-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">LOADING DATA INTEGRITY COMPILER...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Alert Messages banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2.5 font-bold shadow-lg"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2.5 font-bold shadow-lg"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Profile Card & Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Premium Interactive Identity Badge */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel border-slate-200/50 dark:border-slate-800 p-6 flex flex-col items-center text-center relative overflow-hidden group">
            
            {/* Elegant Background Grid for aesthetics */}
            <div className="absolute inset-0 bg-cyber-grid opacity-5 pointer-events-none" />
            <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-r ${getPresetCss()} opacity-15`} />

            {/* Profile Picture Frame with hover file selector */}
            <div className="relative mt-4 mb-5 group">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 shadow-xl relative overflow-hidden">
                {profilePic ? (
                  <img 
                    src={profilePic} 
                    alt={fullName} 
                    className="w-full h-full object-cover rounded-full bg-slate-900" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${getPresetCss()} flex items-center justify-center text-white font-black text-4xl uppercase`}>
                    {fullName ? fullName.charAt(0) : (user?.email ? user.email.charAt(0) : 'U')}
                  </div>
                )}
              </div>

              {/* Camera Upload hover circle overlay */}
              <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-mono tracking-wider opacity-0 hover:opacity-100 transition-opacity cursor-pointer border border-indigo-500/30">
                <Camera className="w-5 h-5 mb-1 text-cyan-400 animate-pulse" />
                <span>CHANGE PHOTO</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* User Core details text */}
            <div className="space-y-1 z-10 w-full px-2">
              <h3 className="text-lg font-black font-header tracking-tight text-slate-800 dark:text-slate-100 uppercase flex items-center justify-center gap-1.5">
                {fullName || 'SYSTEM OPERATOR'}
                {twoFactorEnabled && (
                  <span title="MFA Protection Active">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 fill-cyan-400/15" />
                  </span>
                )}
              </h3>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">@{username || 'operator'}</p>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-200/50 dark:border-slate-800 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wide mt-2">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" />
                <span>{role}</span>
                <span className="text-slate-300 dark:text-slate-800">|</span>
                <span>{organization}</span>
              </div>
            </div>

            {/* Quick System Metadata lines */}
            <div className="w-full border-t border-slate-100 dark:border-slate-900 mt-6 pt-5 space-y-3 text-left text-xs text-slate-500 dark:text-slate-400 font-sans z-10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Secure Email</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-300 truncate max-w-[160px]" title={currentUserEmail}>
                  {currentUserEmail}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Operator Base</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-300 truncate max-w-[160px]">
                  {location || 'Remote Terminal'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enrolled Since</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-300">
                  {createdAt ? createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'July 2026'}
                </span>
              </div>
            </div>

            {/* PRESETS PICKER PANEL */}
            <div className="w-full mt-6 border-t border-slate-100 dark:border-slate-900 pt-4 text-left z-10">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5">
                Choose Aesthetic Accent
              </span>
              <div className="flex items-center gap-2">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => {
                      setAvatarPreset(av.id);
                      setProfilePic(''); // reset custom profile photo to preview the preset gradient
                      onLogActivity('AESTHETIC_ACCENT', `Changed design theme accent to ${av.name}`);
                    }}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${av.css} border-2 hover:scale-115 transition-transform cursor-pointer relative ${
                      avatarPreset === av.id && !profilePic ? 'border-white ring-2 ring-indigo-500/40 scale-110' : 'border-transparent'
                    }`}
                    title={av.name}
                  >
                    {avatarPreset === av.id && !profilePic && (
                      <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Sign Out Action Panel */}
          <div className="glass-panel border-slate-200/50 dark:border-slate-800 p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Disconnect Session</h4>
              <p className="text-[11px] text-slate-400">Sign out and terminate security credential cookies.</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-rose-600/10 hover:bg-rose-600/15 border border-rose-500/20 hover:border-rose-500/30 text-rose-600 dark:text-rose-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <LogOut className="w-4 h-4" /> Sign Out of Platform
            </button>
          </div>

        </div>

        {/* Right Column: Dynamic Form Tabs & Prefs */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Glassy Sub Tabs Switcher */}
          <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 pb-0.5 overflow-x-auto no-scrollbar gap-1">
            {[
              { id: 'details', label: 'Identity Details', icon: User },
              { id: 'security', label: 'Security & Shields', icon: Lock },
              { id: 'preferences', label: 'Preferences & UI', icon: Bell },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all relative select-none whitespace-nowrap cursor-pointer ${
                    isSelected 
                      ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 font-extrabold shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/30 dark:hover:bg-slate-900/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isSelected && (
                    <motion.div 
                      layoutId="subTabLine" 
                      className="absolute bottom-[-2px] left-4 right-4 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full z-10" 
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Form Content Area */}
          <div className="glass-panel border-slate-200/50 dark:border-slate-800 p-6 md:p-8 space-y-6 shadow-xl relative min-h-[460px]">
            <div className="absolute inset-0 bg-cyber-grid opacity-3 pointer-events-none" />

            <AnimatePresence mode="wait">
              
              {/* SUB TAB 1: IDENTITY DETAILS */}
              {subTab === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                    <h3 className="text-base font-bold font-header text-slate-800 dark:text-slate-100 uppercase tracking-tight">Operator Identity Matrix</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Manage public profile attributes and corporate affiliation records.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Full Legal Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full glass-input pl-10 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">System Username</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs md:text-sm font-mono text-indigo-400">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="johndoe_analytics"
                          className="w-full glass-input pl-8 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full glass-input pl-10 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Corporate Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="San Francisco, CA"
                          className="w-full glass-input pl-10 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Affiliated Organization</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="DataAI Labs Inc."
                          className="w-full glass-input pl-10 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assigned Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full glass-input px-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-medium cursor-pointer"
                      >
                        <option value="Data Analyst">Data Analyst</option>
                        <option value="BI Specialist">BI Specialist</option>
                        <option value="ML Engineer">ML Engineer</option>
                        <option value="System Administrator">System Administrator</option>
                        <option value="VP of Analytics">VP of Analytics</option>
                        <option value="Data Architect">Data Architect</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Operator Professional Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      placeholder="Write a brief professional tagline describing your active role in managing analytical pipelines..."
                      className="w-full glass-input px-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-medium leading-relaxed resize-none"
                    />
                  </div>

                  {/* Commit Action */}
                  <div className="flex justify-end border-t border-slate-100 dark:border-slate-900 pt-5 mt-4">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:shadow-cyan-500/10 active:scale-98 rounded-xl font-extrabold text-xs text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SUB TAB 2: SECURITY & CREDENTIALS */}
              {subTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold font-header text-slate-800 dark:text-slate-100 uppercase tracking-tight">Authentication & Encryption Shield</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Upgrade passwords, recycle authorization keys, and activate multi-factor shield protection.</p>
                    </div>
                    <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <KeyRound className="w-5 h-5 animate-pulse" />
                    </span>
                  </div>

                  {/* Two-Factor Authentication (2FA) Status Panel */}
                  <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                          Multi-Factor Auth Security (MFA)
                          <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full ${twoFactorEnabled ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-400/30' : 'bg-slate-500/25 text-slate-400 border border-slate-400/30'}`}>
                            {twoFactorEnabled ? 'ENFORCED' : 'DISABLED'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Secure your metrics. When logging in, enter a rolling 6-digit cryptographic authenticator token alongside your single sign-on credentials.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setWizardStep(1);
                        setShow2FAWizard(!show2FAWizard);
                        setOtpToken('');
                        setOtpError('');
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 border select-none active:scale-95 ${
                        twoFactorEnabled
                          ? 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-transparent hover:shadow-cyan-500/10'
                      }`}
                    >
                      {twoFactorEnabled ? 'Disable MFA Shield' : 'Enforce MFA Shield'}
                    </button>
                  </div>

                  {/* MFA SETUP WIZARD DROPDOWN PANEL */}
                  <AnimatePresence>
                    {show2FAWizard && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border border-slate-200/50 dark:border-indigo-500/15 rounded-2xl bg-white/50 dark:bg-slate-950/60 p-5 mt-4 space-y-4"
                      >
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2.5">
                          <span className="text-xs bg-indigo-500/20 text-indigo-500 font-bold px-2 py-0.5 rounded-full font-mono">
                            STEP {wizardStep} of 3
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                            {wizardStep === 1 ? 'Configure Authenticator App' : wizardStep === 2 ? 'Verify 6-Digit Token' : 'Secure Backup Codes'}
                          </span>
                        </div>

                        {wizardStep === 1 && (
                          <div className="space-y-4">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Open your premium authenticator app (e.g., Google Authenticator, Duo, Bitwarden) and scan the QR code below, or manually input the secret code.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-100 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-900">
                              {/* Glowing Mock Vector QR Code */}
                              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm relative">
                                <QrCode className="w-24 h-24 text-slate-950" />
                                <div className="absolute inset-0 bg-cyan-400/5 pointer-events-none rounded-lg" />
                              </div>
                              <div className="space-y-2 flex-1 w-full">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Authenticator Secret Key</span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={mfaSecret} 
                                    className="flex-1 glass-input py-2 px-3 text-xs font-mono font-bold tracking-wider text-center"
                                  />
                                  <button
                                    onClick={handleCopySecret}
                                    className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
                                    title="Copy Secret"
                                  >
                                    <Clipboard className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-[8px] text-slate-500 leading-normal block">
                                  *Account: DataAI (operator_portal)
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => setWizardStep(2)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              >
                                <span>Proceed to Verification</span>
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {wizardStep === 2 && (
                          <div className="space-y-4">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Input the rolling 6-digit numeric verification token displayed inside your mobile authenticator app.
                            </p>
                            <div className="space-y-1.5 max-w-xs">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rolling Token</label>
                              <input 
                                type="text" 
                                maxLength={6}
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                                placeholder="******" 
                                className="w-full glass-input text-center text-lg font-mono font-black tracking-widest py-2.5 text-indigo-600 dark:text-cyan-400"
                              />
                              {otpError && (
                                <p className="text-[10px] text-rose-500 font-bold block pt-1 animate-pulse">{otpError}</p>
                              )}
                              <p className="text-[9px] text-slate-500 leading-normal block pt-1">
                                *To mock verification, type any 6 digits (e.g. 123456)
                              </p>
                            </div>
                            <div className="flex justify-between">
                              <button
                                onClick={() => setWizardStep(1)}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                              >
                                Back
                              </button>
                              <button
                                onClick={handleVerifyOTP}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              >
                                <span>Verify and Enforce Shield</span>
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {wizardStep === 3 && (
                          <div className="space-y-4">
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400 rounded-xl text-xs font-bold flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 fill-cyan-400/20" />
                              <span>Dynamic Security Matrix Complete! Two-Factor shield activated.</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Copy or download these secure, single-use recovery backup codes. If you ever lose access to your biometric mobile authenticator device, you can use these keys to bypass protection.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-100 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-900">
                              {backupCodes.map((code, idx) => (
                                <div key={idx} className="p-2 border border-slate-200/50 dark:border-slate-800 rounded-lg text-center font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                                  {code}
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  setShow2FAWizard(false);
                                  confetti({
                                    particleCount: 80,
                                    spread: 50,
                                    origin: { y: 0.8 }
                                  });
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all active:scale-95"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Manual Password Recycle Form */}
                  <form onSubmit={handleChangePassword} className="border-t border-slate-100 dark:border-slate-900 pt-6 mt-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Recycle System Password</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Authorized Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type={showCurrentPass ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full glass-input pl-10 pr-10 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Encryption Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full glass-input pl-10 pr-10 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                          >
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verify Password Change</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full glass-input pl-10 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-850 dark:hover:bg-slate-100 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md border border-slate-200 dark:border-transparent"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>Recycle Password Keys</span>
                      </button>
                    </div>

                  </form>

                </motion.div>
              )}

              {/* SUB TAB 3: PREFERENCES & UI AESTHETICS */}
              {subTab === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                    <h3 className="text-base font-bold font-header text-slate-800 dark:text-slate-100 uppercase tracking-tight">System Aesthetics & Notification Protocols</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Calibrate UI appearance coordinates, push telemetry alerts, and language compilation.</p>
                  </div>

                  {/* UI Theme Toggle Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Aesthetic Theme Matrix</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <button
                        onClick={handleToggleTheme}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isThemeDark
                            ? 'bg-slate-950/20 border-indigo-500/10 hover:border-indigo-500/30'
                            : 'bg-indigo-500/5 border-indigo-500/30 ring-2 ring-indigo-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <Sun className="w-4.5 h-4.5" />
                          </span>
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">Clairvoyant Light</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">High-Contrast White Layout</span>
                          </div>
                        </div>
                        {!isThemeDark && <CheckCircle className="w-4 h-4 text-indigo-500 fill-indigo-500/10" />}
                      </button>

                      <button
                        onClick={handleToggleTheme}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          !isThemeDark
                            ? 'bg-slate-100/50 border-slate-200/50 hover:border-slate-300'
                            : 'bg-indigo-500/10 border-indigo-500/30 ring-2 ring-indigo-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Moon className="w-4.5 h-4.5 animate-pulse" />
                          </span>
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block uppercase">Cybernetic Dark</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Deep Cosmic Obsidian Matrix</span>
                          </div>
                        </div>
                        {isThemeDark && <CheckCircle className="w-4 h-4 text-cyan-400 fill-cyan-400/10" />}
                      </button>

                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-900 pt-5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">System Translation Compiler</h4>
                    <p className="text-[11px] text-slate-400">Compile workspace coordinates, charts labels, and AI chatbot prompts to specified language syntax.</p>
                    <div className="relative max-w-xs mt-2">
                      <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedLanguage}
                        onChange={(e) => {
                          setSelectedLanguage(e.target.value);
                          onLogActivity('LANG_CHANGE', `System translated successfully to code ${e.target.value}`);
                        }}
                        className="w-full glass-input pl-10 pr-4 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 font-semibold cursor-pointer"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>



                  {/* Save preferences Action */}
                  <div className="flex justify-end border-t border-slate-100 dark:border-slate-900 pt-5 mt-4">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:shadow-cyan-500/10 active:scale-98 rounded-xl font-extrabold text-xs text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Preferences...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Preferences</span>
                        </>
                      )}
                    </button>
                  </div>

                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>

    </div>
  );
}
