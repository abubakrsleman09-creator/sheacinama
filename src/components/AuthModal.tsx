import React, { useState } from "react";
import { 
  X, 
  LogIn, 
  UserPlus, 
  Mail, 
  Key, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Info
} from "lucide-react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccess("بە سەرکەوتوویی چووە ژوورەوە!");
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-blocked") {
        setError("پۆپ-ئەپ بلۆک کراوە. تکایە ڕێگە بە پۆپ-ئەپ بدە یان لە تابی نوێ تاقیبکەوە.");
      } else if (err.code === "auth/unauthorized-domain") {
        const hostname = window.location.hostname;
        setError(`ئەم دۆمەینە (${hostname}) لە پرۆژەی فایەربەیسەکەت مۆڵەت پێ نەدراوە (Unauthorized Domain). تکایە بچۆ بۆ کۆنسۆڵی فایەربەیس و زیادی بکە.`);
      } else {
        setError("چوونەژوورەوە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدەرەوە.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const emailTrimmed = email.trim();

    if (mode === "forgot") {
      if (!emailTrimmed) {
        setError("تکایە ئیمەیڵەکەت بنووسە.");
        setIsLoading(false);
        return;
      }
      try {
        await sendPasswordResetEmail(auth, emailTrimmed);
        setSuccess("نامەی گۆڕینی پاسۆرد نێردرا بۆ ئیمەیڵەکەت! تکایە سەیری ئیمەیڵەکەت یان بەشی سپام (Spam) بکە.");
        setEmail("");
      } catch (err: any) {
        console.error("Forgot Password Error:", err);
        switch (err.code) {
          case "auth/user-not-found":
            setError("هیچ ئەکاونتێک بەم ئیمەیڵە تۆمار نەکراوە.");
            break;
          case "auth/invalid-email":
            setError("ئیمەیڵەکە دروست نییە. تکایە ئیمەیڵێکی ڕاست بنووسە.");
            break;
          default:
            setError(err.message || "هەڵەیەک ڕوویدا لە کاتی ناردنی بەستەری نوێکردنەوە.");
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const passwordTrimmed = password;

    if (!emailTrimmed || !passwordTrimmed) {
      setError("تکایە هەموو خانەکان پڕبکەوە.");
      setIsLoading(false);
      return;
    }

    if (mode === "signup" && passwordTrimmed.length < 6) {
      setError("پێویستە پاسوۆرد لایەنی کەم ٦ پیت یان ژمارە بێت.");
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "signup") {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
        
        // Update display name if provided
        if (displayName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim()
          });
        }
        
        setSuccess("ئەکاونتەکەت بە سەرکەوتوویی دروستکرا!");
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
        setSuccess("بە سەرکەوتوویی چووە ژوورەوە!");
      }

      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1200);

    } catch (err: any) {
      console.error("Auth Error:", err);
      // Map Firebase auth errors to Kurdish user-friendly messages
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("ئەم ئیمەیڵە پێشتر بەکارهێنراوە بۆ دروستکردنی ئەکاونت.");
          break;
        case "auth/invalid-email":
          setError("ئیمەیڵەکە دروست نییە. تکایە ئیمەیڵێکی ڕاست بنووسە.");
          break;
        case "auth/operation-not-allowed":
          setError("سەرکەوتوو نەبوو. ڕەنگە رێگەی چوونەژوورەوە بە ئیمەیڵ لە فایەربەیس چالاک نەکرابێت.");
          break;
        case "auth/weak-password":
          setError("پاسوۆردەکە زۆر لاوازە.");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("ئیمەیڵ یان پاسوۆردەکە هەڵەیە. تکایە دڵنیابەرەوە لە زانیارییەکانت.");
          break;
        default:
          setError(err.message || "هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
    setSuccess(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rtl-dir"
      id="auth-modal-overlay"
    >
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-850 bg-[#0d0d10] shadow-2xl relative"
        id="auth-modal-card"
      >
        {/* Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-900 px-6 py-4">
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-stone-500 hover:bg-stone-900 hover:text-stone-300 transition-colors"
            title="داخستن"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-stone-200">
              {mode === "signin" ? "چوونەژوورەوە بۆ ئەکاونت" : mode === "signup" ? "دروستکردنی ئەکاونتی نوێ" : "نوێکردنەوەی پاسۆرد"}
            </span>
            <div className="rounded-full bg-yellow-500/10 p-1.5 text-yellow-500 text-xs">
              {mode === "signin" ? <LogIn size={14} /> : mode === "signup" ? <UserPlus size={14} /> : <Key size={14} />}
            </div>
          </div>
        </div>

        {/* Auth Body */}
        <div className="p-6 space-y-5">
          
          {/* Logo / Greeting */}
          <div className="text-center space-y-1">
            <h3 className="font-display text-xl font-black text-white tracking-wide">
              SHEA <span className="text-yellow-400">CINEMA</span>
            </h3>
            <p className="text-[11px] text-stone-400 font-sans">
              {mode === "signin" 
                ? "بەخێربێیتەوە! تکایە بچۆ ژوورەوە بۆ بینینی لایڤ ستریم" 
                : mode === "signup"
                ? "ئەکاونتی نوێ دروستبکە بۆ هەڵگرتن و بینینی نایابترین تەنەر و فیلمەکان"
                : "تکایە ناونیشانی ئیمەیڵەکەت بنووسە بۆ ناردنی بەستەری گۆڕینی پاسۆرد"}
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 flex items-start gap-2.5 text-right">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200 leading-normal flex-1">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-start gap-2.5 text-right animate-pulse">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200 leading-normal flex-1">
                {success}
              </div>
            </div>
          )}

          {/* Core Auth Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="block text-right text-xs font-semibold text-stone-400 font-sans">ناوی تەواو:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="نموونە: ئاراس سلێمان"
                    className="w-full text-right text-xs rounded-xl border border-stone-800 bg-[#141417] pl-3 pr-10 py-3 text-stone-100 placeholder-stone-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/20 transition-all font-sans"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-650">
                    <User size={14} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-right text-xs font-semibold text-stone-400 font-sans">ئیمەیڵ:</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-left text-xs rounded-xl border border-stone-800 bg-[#141417] pl-3 pr-10 py-3 text-stone-100 placeholder-stone-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/20 transition-all font-sans"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-650">
                  <Mail size={14} />
                </div>
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-row-reverse">
                  <label className="block text-right text-xs font-semibold text-stone-400 font-sans">پاسوۆرد:</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
                      className="text-[11px] text-yellow-405 text-yellow-400 hover:underline hover:text-yellow-300 font-bold font-sans cursor-pointer"
                    >
                      پاسۆردت لەبیرچووە؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-left text-xs rounded-xl border border-stone-800 bg-[#141417] pl-3 pr-10 py-3 text-stone-100 placeholder-stone-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/20 transition-all font-sans"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-650">
                    <Key size={14} />
                  </div>
                </div>
              </div>
            )}

            {/* Email Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-stone-950 py-3 text-xs font-bold transition-all duration-200 mt-2 flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(234,179,8,0.15)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
              ) : mode === "signin" ? (
                <>
                  <LogIn size={14} />
                  <span>چوونەژوورەوە</span>
                </>
              ) : mode === "signup" ? (
                <>
                  <UserPlus size={14} />
                  <span>دروستکردنی ئەکاونت</span>
                </>
              ) : (
                <>
                  <Mail size={14} />
                  <span>ناردنی بەستەری نوێکردنەوە</span>
                </>
              )}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              {/* Social login divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-900" />
                </div>
                <span className="relative bg-[#0d0d10] px-3.5 text-[10px] text-stone-550 font-bold uppercase tracking-wider font-sans">
                  یان بە شێوازی تر
                </span>
              </div>

              {/* Google SSO */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full rounded-xl border border-stone-850 bg-stone-950 hover:bg-stone-900 hover:border-stone-800 text-stone-200 px-4 py-3 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.332 2.682 1.386 6.614l3.88 3.151z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.518 12.303c0-.822-.074-1.614-.21-2.383H12v4.545h6.486a5.543 5.543 0 0 1-2.405 3.636l3.755 2.91c2.195-2.023 3.473-5.005 3.473-8.708z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.795.127-1.56.357-2.265l-3.88-3.151C.48 8.659 0 10.273 0 12s.481 3.341 1.386 5.416l3.88-3.181z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.955-1.077 7.94-2.915l-3.755-2.91c-1.04.695-2.373 1.108-4.185 1.108-3.218 0-5.945-2.176-6.918-5.1"
                  />
                </svg>
                <span className="font-sans">چوونەژوورەوە بە ئەکاونتی گووگڵ</span>
              </button>
            </>
          )}

          {/* Toggle Modes */}
          <div className="text-center text-xs font-sans text-stone-400 mt-2">
            {mode === "forgot" ? (
              <span>
                گەڕانەوە بۆ{" "}
                <button 
                  type="button"
                  onClick={() => { setMode("signin"); setError(null); setSuccess(null); }}
                  className="text-yellow-405 font-bold text-yellow-400 hover:underline cursor-pointer"
                >
                  بچۆ ژوورەوە
                </button>
              </span>
            ) : mode === "signin" ? (
              <span>
                تا ئێستا ئەکاونتت نییە؟{" "}
                <button 
                  onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
                  className="text-yellow-405 font-bold text-yellow-400 hover:underline cursor-pointer"
                >
                  ئەکاونتێکی نوێ دروست بکە
                </button>
              </span>
            ) : (
              <span>
                پێشتر ئەکاونتت دروستکردووە؟{" "}
                <button 
                  onClick={() => { setMode("signin"); setError(null); setSuccess(null); }}
                  className="text-yellow-405 font-bold text-yellow-400 hover:underline cursor-pointer"
                >
                  بچۆ ژوورەوە
                </button>
              </span>
            )}
          </div>

          {/* Interactive Help/Note for enabling email auth of standard guidelines */}
          <div className="rounded-xl border border-stone-900 bg-stone-950/40 p-3 flex gap-2 items-start text-right">
            <Info size={14} className="text-yellow-500/70 shrink-0 mt-0.5" />
            <div className="text-[10px] text-stone-500 leading-relaxed font-sans">
              سیستەمی Authentication پشت بە فایەربەیس دەبەستێت. گەر ئیمەیڵ/پاسوۆرد کار نەهێنرا، پێویستە دەستکاریکەر لە 
              <span className="text-stone-400"> Firebase Console </span> 
              بەکشی رێگەی چوونەژوورەوە بە ئیمەیڵ چالاک بکات.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
