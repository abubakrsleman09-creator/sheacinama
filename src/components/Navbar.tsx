import { useState, useRef, useEffect } from "react";
import { Film, Send, LogIn, LogOut, User, Activity, Settings, ChevronDown } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import NotificationCenter from "./NotificationCenter";

interface NavbarProps {
  user: FirebaseUser | null;
  customPhotoURL?: string | null;
  customDisplayName?: string | null;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onEditProfileClick: () => void;
  onAdminPanelToggle: () => void;
  showAdminPanel: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Navbar({
  user,
  customPhotoURL,
  customDisplayName,
  isAdmin,
  onLoginClick,
  onLogoutClick,
  onEditProfileClick,
  onAdminPanelToggle,
  showAdminPanel,
  searchQuery,
  setSearchQuery,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-800 bg-[#0c0c0d]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        {/* Right side: Logo (Since Kurdish is RTL, let's put core branding or standard RTL flow layout) */}
        <div className="flex items-center gap-6 rtl-dir">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500 text-stone-950 transition-transform group-hover:scale-105 duration-200">
              <Film size={22} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col text-right">
              <span className="font-display text-lg font-bold tracking-wider text-white select-none">
                SHEA <span className="text-yellow-400">CINEMA</span>
              </span>
              <span className="text-[10px] text-stone-400 font-sans tracking-wide">
                کۆکراوەی ناوازەترین فیلم و زنجیرەکان
              </span>
            </div>
          </a>
        </div>

        {/* Center: Live Real-time Search input */}
        <div className="hidden max-w-md flex-1 px-8 md:block ltr-dir">
          <div className="relative">
            <input
              type="text"
              placeholder="بگەڕێ بۆ فیلم یان زنجیرە..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-stone-800 bg-[#141416] py-2 pl-4 pr-10 text-right text-sm text-stone-100 placeholder-stone-500 transition-all focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-500">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Left side: Navigation links, Telegram & Admin Authentication */}
        <div className="flex items-center gap-3">
          {/* Join Telegram Button */}
          <a
            href="https://t.me/sheacinema_offical"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-[#1e2530] px-4 py-2 text-xs font-semibold text-sky-400 transition-all hover:bg-sky-500/10 hover:shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)]"
          >
            <Send size={14} className="transform rotate-[-30deg]" />
            <span className="hidden sm:inline font-sans">تێلیگرام</span>
          </a>

          {/* Admin Dashboard Access */}
          {isAdmin && (
            <button
              onClick={onAdminPanelToggle}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                showAdminPanel
                  ? "bg-yellow-500 text-stone-950 hover:bg-yellow-400"
                  : "bg-[#27272a] text-stone-200 hover:bg-[#3f3f46]"
              }`}
            >
              <Activity size={14} />
              <span className="font-sans">
                {showAdminPanel ? "گەڕانەوە بۆ ناو کەتەلۆگ" : "کۆنترۆڵ پانێڵ"}
              </span>
            </button>
          )}

          {/* Notification center */}
          {user && <NotificationCenter user={user} />}

          {/* User auth state */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 rounded-full border border-stone-800 bg-[#121214] pl-2 pr-3 py-1.5 text-xs text-stone-300 transition-all hover:bg-stone-900 hover:text-white"
              >
                <ChevronDown size={14} className={`text-stone-500 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
                <span className="max-w-[70px] truncate font-sans font-medium">{customDisplayName || user.displayName || "بەکارهێنەر"}</span>
                {customPhotoURL || (user.photoURL && user.photoURL !== "/custom_avatar") ? (
                  <img
                    src={customPhotoURL || user.photoURL || undefined}
                    alt="avatar"
                    className="h-6 w-6 rounded-full border border-yellow-500/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-stone-400">
                    <User size={12} />
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-xl border border-stone-800 bg-[#0c0c0d] p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 text-right">
                  {/* User info head */}
                  <div className="px-3 py-2.5 border-b border-stone-850 mb-1">
                    <p className="text-xs font-semibold text-white font-sans truncate">{customDisplayName || user.displayName || "بەکارهێنەر"}</p>
                    <p className="text-[10px] text-stone-500 font-mono truncate mt-0.5">{user.email}</p>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => {
                      onEditProfileClick();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-end gap-2.5 rounded-lg px-3 py-2 text-right text-xs text-stone-300 hover:bg-stone-900 hover:text-yellow-400 transition-colors font-sans"
                  >
                    <span>ڕێکخستنەکانی ئەکاونت</span>
                    <Settings size={14} />
                  </button>

                  <button
                    onClick={() => {
                      onLogoutClick();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-end gap-2.5 rounded-lg px-3 py-2 text-right text-xs text-red-400 hover:bg-red-500/10 transition-colors font-sans"
                  >
                    <span>دەرچوون لە ئەکاونت</span>
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 rounded-full border border-stone-800 bg-[#121214] px-4 py-2 text-xs font-medium text-stone-300 transition-all hover:bg-stone-900 hover:text-white"
            >
              <LogIn size={14} className="text-yellow-400" />
              <span className="font-sans">چوونەژوورەوە</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub header search bar for mobile devices */}
      <div className="block px-4 pb-4 md:hidden">
        <div className="relative ltr-dir">
          <input
            type="text"
            placeholder="بگەڕێ بۆ فیلم یان زنجیرە..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-stone-800 bg-[#141416] py-2 pl-4 pr-10 text-right text-sm text-stone-100 placeholder-stone-500 focus:border-yellow-500/50 focus:outline-none"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-500">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
