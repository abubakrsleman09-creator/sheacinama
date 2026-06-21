import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  Mail, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  History,
  Activity,
  Film,
  Tv,
  Award,
  Trash2,
  Clock,
  RotateCw
} from "lucide-react";
import { 
  updateProfile, 
  updatePassword, 
  User as FirebaseUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  getDocs,
  writeBatch,
  setDoc
} from "firebase/firestore";
import { auth, db } from "../firebase";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  customPhotoURL: string | null;
  onProfileUpdated: () => void;
}

const PRESET_AVATARS = [
  { id: "popcorn", name: "پۆپکۆرن", url: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "cinema", name: "کامێرا", url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "joker", name: "جۆکەر", url: "https://images.unsplash.com/photo-1601513525393-83938559df2c?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "superhero", name: "بەرگریکار", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "neon", name: "نیۆن", url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=150&h=150&q=80" },
];

export default function EditProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  customPhotoURL, 
  onProfileUpdated 
}: EditProfileModalProps) {
  // Tabs: 'profile' | 'stats'
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');

  // Basic Profile Fields
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  
  // Security/Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Watch History states
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  // Initialize fields
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPhotoUrl(customPhotoURL || user.photoURL || "");
      // Reset states
      setError(null);
      setSuccess(null);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setShowPasswordFields(false);
    }
  }, [user, customPhotoURL, isOpen]);

  // Real-time listener for watch history
  useEffect(() => {
    if (!isOpen || !user || activeTab !== 'stats') return;

    const q = query(
      collection(db, "watch_history"),
      where("userId", "==", user.uid),
      orderBy("watchedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyList: any[] = [];
      snapshot.forEach((docSnap) => {
        historyList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setWatchHistory(historyList);
    }, (err) => {
      console.error("Watch history read error:", err);
    });

    return () => unsubscribe();
  }, [user, isOpen, activeTab]);

  if (!isOpen || !user) return null;

  const isEmailProvider = user.providerData.some(p => p.providerId === "password");

  // Local avatar compression to prevent Firebase Auth limits & fast UI loading
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const SIZE = 200; // Profile square size is lightweight and high definition
        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Centered cover crop
          const size = Math.min(img.width, img.height);
          const xOffset = (img.width - size) / 2;
          const yOffset = (img.height - size) / 2;

          ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, SIZE, SIZE);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          setPhotoUrl(compressedBase64);
          setIsLoading(false);
        } else {
          setError("هەڵەیەک ڕوویدا لە کەمکردنەوەی قەبارەی وێنەکە.");
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        setError("پەڕگەی وێنەکە دروست نییە یان زیانی پێگەیشتووە.");
        setIsLoading(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const isBase64 = photoUrl.startsWith("data:");
      // If it's a huge Base64 string, store "/custom_avatar" key in auth profile to bypass 2048-char limitation
      const authPhotoValue = isBase64 ? "/custom_avatar" : photoUrl;

      // 1. Update basic profile info in Firebase authentication
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: authPhotoValue
      });

      // 2. Save/Sync custom avatar data in Firestore under /profiles/{uid}
      await setDoc(doc(db, "profiles", user.uid), {
        photoURL: photoUrl,
        displayName: displayName.trim(),
        updatedAt: new Date().toISOString()
      });

      // 3. Handle Password Change if requested
      if (showPasswordFields && newPassword) {
        if (!isEmailProvider) {
          throw new Error("تۆ بە ئەکاونتی گووگڵ هاتوویتیە ژوورەوە، ناتوانیت لێرەوە پاسوۆرد بگۆڕیت.");
        }

        if (newPassword.length < 6) {
          throw new Error("پێویستە پاسوۆردەکە لایەنی کەم ٦ تیپ یان پیت بێت.");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("پاسوۆردە نوێیەکە هاوتا نییە لەگەڵ لێدانەوەی پاسوۆردەکە.");
        }

        if (!currentPassword) {
          throw new Error("تکایە پاسوۆردی ئێستات بنووسە بۆ بەردەوامبوون و پشتڕاستکردنەوەی شوناس.");
        }

        // Reauthenticate
        try {
          const credential = EmailAuthProvider.credential(user.email || "", currentPassword);
          await reauthenticateWithCredential(user, credential);
        } catch (authErr) {
          console.error("Reauth error:", authErr);
          throw new Error("پاسوۆردی ئێستات هەڵەیە، تکایە سەرنج بدەوە.");
        }

        // Update password
        await updatePassword(user, newPassword);
      }

      setSuccess("زانیارییەکانی ئەکاونتەکەت سەرکەوتووانە نوێکرانەوە!");
      onProfileUpdated();
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "هەڵەیەک لە نوێکردنەوەی زانیارییەکان ڕوویدا.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a single watch history record
  const handleDeleteHistoryItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "watch_history", itemId));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  // Clear entire watch history
  const handleClearAllHistory = async () => {
    if (!window.confirm("ئایا دڵنیایت لە پاککردنەوەی تەواوی مێژووی بینینی فیلم و زنجیرەکانت؟")) {
      return;
    }
    setIsClearingHistory(true);
    try {
      const q = query(
        collection(db, "watch_history"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to clear watch history:", err);
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Stats calculation
  const totalWatched = watchHistory.length;
  const movieCount = watchHistory.filter(item => item.movieCategory === "فیلم" || item.movieCategory !== "زنجیرە").length;
  const seriesCount = watchHistory.filter(item => item.movieCategory === "زنجیرە").length;

  // Favorite Genre calculation
  const getFavoriteGenre = () => {
    if (watchHistory.length === 0) return "بێ بینین";
    const genres: { [key: string]: number } = {};
    watchHistory.forEach(item => {
      if (item.movieGenre) {
        const itemGenres = item.movieGenre.split(",").map((g: string) => g.trim());
        itemGenres.forEach((g: string) => {
          if (g) genres[g] = (genres[g] || 0) + 1;
        });
      }
    });
    
    let favGenre = "دیارینەکراو";
    let maxCount = 0;
    Object.entries(genres).forEach(([genre, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favGenre = genre;
      }
    });

    return favGenre;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md transition-opacity duration-300">
      {/* Container */}
      <div 
        id="profile_modal_container"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-800 bg-[#0c0c0d] shadow-2xl transition-all duration-300 flex flex-col max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-stone-400 transition-all hover:bg-stone-800 hover:text-white"
        >
          <X size={16} />
        </button>

        {/* Heading */}
        <div className="p-6 pb-2 border-b border-stone-900 text-right">
          <h3 className="flex items-center justify-end gap-2 text-xl font-bold text-white font-sans">
            <span>دەستکاریکردنی زانیارییەکان و مێژوو</span>
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </h3>
          <p className="mt-1.5 text-xs text-stone-400 font-sans">
            لێرەوە دەتوانیت زانیارییەکانی ئەکاونتت نوێ بکەیتەوە، یاخود مێژووی سەیرکردن و ئامارەکانت ببینیت.
          </p>

          {/* Persian/Kurdish custom Tab Selectors */}
          <div className="flex gap-2 mt-4 bg-stone-900/40 p-1 rounded-xl border border-stone-800/40">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'stats'
                  ? "bg-yellow-500 text-stone-950 shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <History size={13} />
              <span>مێژووی بینین & ئامارەکان</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'profile'
                  ? "bg-yellow-500 text-stone-950 shadow-md"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <User size={13} />
              <span>ڕێکخستنەکانی ئەکاونت</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Outer Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-right text-red-400">
              <span className="text-xs font-sans font-medium flex-1 leading-relaxed">{error}</span>
              <AlertCircle size={18} className="shrink-0 text-red-500" />
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-right text-emerald-400">
              <span className="text-xs font-sans font-medium flex-1 leading-relaxed">{success}</span>
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            </div>
          )}

          {/* TAB 1: Edit Profile details */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              
              {/* Profile Avatar Selection Box */}
              <div className="flex flex-col items-center gap-4 rounded-xl border border-stone-800 bg-stone-900/30 p-4">
                <div className="relative group">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-500 shadow-md">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt="Avatar" 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-stone-800 text-stone-400">
                        <User size={32} />
                      </div>
                    )}
                  </div>
                  
                  {/* File Upload Trigger */}
                  <label 
                    htmlFor="avatar-file-input" 
                    className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-yellow-500 text-stone-950 shadow-md transition-all hover:bg-yellow-400 hover:scale-105"
                  >
                    <Camera size={14} className="stroke-[2.5]" />
                    <input 
                      id="avatar-file-input" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>

                {/* Preset avatars selection */}
                <div className="w-full text-center">
                  <span className="text-[11px] font-sans text-stone-500 block mb-2">یان وەرزی وێنەیەکی دیاریکراو هەڵبژێرە:</span>
                  <div className="flex items-center justify-center gap-2">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setPhotoUrl(av.url)}
                        title={av.name}
                        className={`h-9 w-9 overflow-hidden rounded-md border transition-all ${
                          photoUrl === av.url ? "border-yellow-500 scale-110 shadow-[0_0_8px_rgba(234,179,8,0.4)]" : "border-stone-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={av.url} alt={av.name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Email Address (View only) */}
              <div className="text-right">
                <label className="mb-1.5 block text-xs font-semibold text-stone-400 font-sans">ناونیشانی ئیمەیڵ</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={user.email || ""}
                    className="w-full cursor-not-allowed rounded-lg border border-stone-800 bg-[#161618] py-2.5 pl-3 pr-10 text-right text-sm text-stone-500 font-sans focus:outline-none"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-600">
                    <Mail size={16} />
                  </div>
                </div>
                <span className="mt-1 block text-[10px] text-stone-600 font-sans">ئەم بەشە ناگۆڕدرێت و تایبەتە بە شوناسی تۆ.</span>
              </div>

              {/* Display Name Input */}
              <div className="text-right">
                <label className="mb-1.5 block text-xs font-semibold text-stone-400 font-sans">ناو / ناوی بەکارهێنەر</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ناوی خۆت بنووسە..."
                    className="w-full rounded-lg border border-stone-800 bg-[#131315] py-2.5 pl-3 pr-10 text-right text-sm text-stone-200 placeholder-stone-660 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 font-sans"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
                    <User size={16} />
                  </div>
                </div>
              </div>

              {/* Change Password Collapsible Section */}
              {isEmailProvider && (
                <div className="rounded-xl border border-stone-850 bg-stone-900/10 p-3 text-right">
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                    className="flex w-full items-center justify-between text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    <ChevronRight size={16} className={`transform transition-transform ${showPasswordFields ? "rotate-90" : "rotate-180"}`} />
                    <span className="flex items-center gap-1.5 font-sans">
                      گۆڕینی تێپەڕەوشە / پاسوۆرد
                      <Key size={13} />
                    </span>
                  </button>

                  {showPasswordFields && (
                    <div className="mt-4 space-y-4 border-t border-stone-800/60 pt-3">
                      
                      {/* Current Password for secure validation */}
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold text-stone-400 font-sans">پاسوۆردی ئێستات</label>
                        <div className="relative">
                          <input
                            type="password"
                            required={showPasswordFields}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="پاسوۆردی ئێستا لێبدە..."
                            className="w-full rounded-lg border border-stone-800 bg-[#131315] py-2.5 pl-3 pr-10 text-right text-xs text-stone-250 placeholder-stone-650 focus:border-yellow-500/50 focus:outline-none"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
                            <ShieldCheck size={15} />
                          </div>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold text-stone-400 font-sans">پاسوۆردی نوێ</label>
                        <div className="relative">
                          <input
                            type="password"
                            required={showPasswordFields}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="نابێت لە ٦ پیت کەمتر بێت..."
                            className="w-full rounded-lg border border-stone-800 bg-[#131315] py-2.5 pl-3 pr-10 text-right text-xs text-stone-250 placeholder-stone-650 focus:border-yellow-500/50 focus:outline-none"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
                            <Key size={15} />
                          </div>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold text-stone-400 font-sans">دووبارەکردنەوەی پاسوۆردی نوێ</label>
                        <div className="relative">
                          <input
                            type="password"
                            required={showPasswordFields}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="دووبارە بنووسەوە..."
                            className="w-full rounded-lg border border-stone-800 bg-[#131315] py-2.5 pl-3 pr-10 text-right text-xs text-stone-250 placeholder-stone-650 focus:border-yellow-500/50 focus:outline-none"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
                            <Key size={15} />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 rounded-full border border-stone-800 bg-transparent py-2.5 text-center text-xs font-semibold text-stone-400 hover:bg-stone-900 hover:text-stone-200 transition-all font-sans"
                >
                  پاشگەزبوونەوە
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 py-2.5 text-center text-xs font-semibold text-stone-950 hover:from-yellow-400 hover:to-amber-400 shadow-lg shadow-yellow-500/10 transition-all font-sans"
                >
                  {isLoading ? "باردەکرێت..." : "پاشەکەوتکردنی گۆڕانکارییەکان"}
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: User Statistics & History */}
          {activeTab === 'stats' && (
            <div className="space-y-6 text-right rtl-dir">
              
              {/* Stat Bento Blocks */}
              <div>
                <h4 className="text-xs font-bold font-sans text-stone-500 mb-2.5 flex items-center justify-end gap-1.5">
                  <span>ئاماری بینینەکانت لە پلاتفۆرمەکە</span>
                  <Activity size={12} className="text-yellow-500" />
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Total views */}
                  <div className="rounded-xl border border-stone-800 bg-[#101012] p-3 text-center">
                    <span className="text-stone-400 text-[10px] font-sans block">سەرجەم بینین</span>
                    <span className="text-lg font-black text-yellow-400 font-mono mt-1 block">{totalWatched}</span>
                  </div>

                  {/* Movies */}
                  <div className="rounded-xl border border-stone-800 bg-[#101012] p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-stone-400 text-[10px] font-sans">
                      <Film size={10} className="text-zinc-500" />
                      <span>فیلمی بینراو</span>
                    </div>
                    <span className="text-lg font-black text-purple-400 font-mono mt-1 block">{movieCount}</span>
                  </div>

                  {/* Episodes */}
                  <div className="rounded-xl border border-stone-800 bg-[#101012] p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-stone-400 text-[10px] font-sans">
                      <Tv size={10} className="text-zinc-500" />
                      <span>ئەڵقەی زنجیرە</span>
                    </div>
                    <span className="text-lg font-black text-sky-400 font-mono mt-1 block">{seriesCount}</span>
                  </div>

                  {/* Favorite Genre */}
                  <div className="rounded-xl border border-stone-800 bg-[#101012] p-3 text-center overflow-hidden">
                    <div className="flex items-center justify-center gap-1 text-stone-400 text-[10px] font-sans">
                      <Award size={10} className="text-yellow-500" />
                      <span>جۆری دڵخواز</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#e11d48] truncate mt-2 block font-sans" title={getFavoriteGenre()}>
                      {getFavoriteGenre()}
                    </span>
                  </div>

                </div>
              </div>

              {/* History list */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-stone-900 pb-2">
                  {totalWatched > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      disabled={isClearingHistory}
                      className="text-[10px] text-red-500 hover:text-red-400 font-sans font-bold flex items-center gap-1.5 cursor-pointer bg-red-500/10 hover:bg-red-500/15 py-1 px-2.5 rounded-lg border border-red-500/20"
                    >
                      <Trash2 size={11} />
                      <span>سڕینەوەی هەمووی</span>
                    </button>
                  )}
                  <h4 className="text-xs font-bold font-sans text-stone-400 flex items-center gap-1.5 justify-end">
                    <span>مێژووی سەیرکردنەکانت</span>
                    <History size={13} className="text-yellow-500" />
                  </h4>
                </div>

                {watchHistory.length === 0 ? (
                  <div className="rounded-2xl border border-stone-900/60 bg-stone-900/10 p-8 text-center text-stone-500 font-sans text-xs">
                    مێژووی بینینەکانت ئێرە پڕ دەکاتەوە! کاتێک دەست دەکەیت بە لێدانی هەر فیلم یان ئەڵقەیەک، زانیاری بینینەکە لەم مێژووەدا بۆت تۆماردەبێت.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {watchHistory.map((item) => (
                      <div 
                        key={item.id}
                        className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-stone-850/80 bg-stone-900/20 hover:bg-stone-900/40 hover:border-stone-800 transition-all text-right"
                      >
                        {/* Left action controls */}
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          title="سڕینەوە لە مێژوو"
                          className="text-stone-600 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer mr-1"
                        >
                          <Trash2 size={13} />
                        </button>

                        {/* Mid content block */}
                        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                          <div className="flex items-center gap-1.5 justify-end mb-0.5 flex-row-reverse">
                            <span className="font-sans font-bold text-xs text-white truncate block">
                              {item.movieTitle}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-sans font-black tracking-wide shrink-0 ${
                              item.movieCategory === "زنجیرە" 
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>
                              {item.movieCategory}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 justify-end text-[10px] text-stone-500 font-sans flex-row-reverse">
                            {item.seasonNumber && item.episodeNumber && (
                              <span className="font-sans text-stone-300 font-bold bg-stone-900 px-1.5 py-0.5 rounded text-[9px] border border-stone-800">
                                وەرزی {item.seasonNumber} - ئەڵقەی {item.episodeNumber}
                              </span>
                            )}
                            <span className="flex items-center gap-1 truncate text-stone-400">
                              <span className="rounded bg-stone-900 px-1">{item.serverName || "پەخشی سەرەکی"}</span>
                              <span>سێرڤەر:</span>
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[9px] text-stone-500 font-medium shrink-0">
                              <Clock size={9} />
                              {item.watchedAt ? new Date(item.watchedAt).toLocaleDateString("en-US", {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"}) : ""}
                            </span>
                          </div>
                        </div>

                        {/* Right avatar/poster preview with error fallback */}
                        <div className="h-10 w-8 overflow-hidden rounded border border-stone-800 shrink-0 bg-stone-900 shadow">
                          <img 
                            src={item.moviePosterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=150&auto=format&fit=crop"} 
                            alt="" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
