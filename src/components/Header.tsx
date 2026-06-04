import { useState } from 'react';
import { Search, Send, Lock, Eye } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenRequestModal: () => void;
  onAdminToggle: () => void;
  isAdmin: boolean;
}

export function Header({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenRequestModal,
  onAdminToggle,
  isAdmin
}: HeaderProps) {
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Side: Actions (Admin & Telegram) */}
        <div className="flex items-center gap-3">
          {/* Telegram Channel Button */}
          <a
            href="https://t.me/sheacinema_offical"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#FFC80A] hover:bg-[#E2B200] text-black font-semibold text-xs md:text-sm px-3 py-1.5 rounded-full shadow-lg shadow-[#FFC80A]/10 transition-all duration-300"
          >
            <Send className="w-4 h-4 text-black transform -rotate-12" />
            <span className="hidden sm:inline">تیلیگرامەکەمان</span>
          </a>

          {/* Admin Dashboard Entry */}
          <button
            id="admin-dashboard-btn"
            onClick={onAdminToggle}
            className={`flex items-center gap-1 text-xs md:text-sm px-3 py-1.5 rounded-full font-medium transition-all duration-300 ${
              isAdmin
                ? "bg-green-600/20 text-green-400 border border-green-500/30"
                : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
            }`}
          >
            {isAdmin ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>دۆخی بەڕێوەبەر</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#FFC80A]" />
                <span>بەڕێوەبەرایەتی</span>
              </>
            )}
          </button>
        </div>

        {/* Center: Search & Navigation */}
        <div className="hidden lg:flex items-center gap-6 rtl-dir">
          <nav className="flex items-center gap-5 text-sm font-medium">
            <button
              onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
              className={`hover:text-[#FFC80A] transition-colors py-1 ${activeTab === 'home' ? 'text-[#FFC80A] border-b-2 border-[#FFC80A]' : 'text-gray-300'}`}
            >
              سەرەتا
            </button>
            <button
              onClick={() => { setActiveTab('movies'); setSearchQuery(''); }}
              className={`hover:text-[#FFC80A] transition-colors py-1 ${activeTab === 'movies' ? 'text-[#FFC80A] border-b-2 border-[#FFC80A]' : 'text-gray-300'}`}
            >
              فیلمەکان
            </button>
            <button
              onClick={() => { setActiveTab('series'); setSearchQuery(''); }}
              className={`hover:text-[#FFC80A] transition-colors py-1 ${activeTab === 'series' ? 'text-[#FFC80A] border-b-2 border-[#FFC80A]' : 'text-gray-300'}`}
            >
              زنجیرەکان
            </button>
            <button
              onClick={() => { setActiveTab('korean'); setSearchQuery(''); }}
              className={`hover:text-[#FFC80A] transition-colors py-1 ${activeTab === 'korean' ? 'text-[#FFC80A] border-b-2 border-[#FFC80A]' : 'text-gray-300'}`}
            >
              کۆراوەکان 🇰🇷
            </button>
            <button
              onClick={() => { setActiveTab('collections'); setSearchQuery(''); }}
              className={`hover:text-[#FFC80A] transition-colors py-1 ${activeTab === 'collections' ? 'text-[#FFC80A] border-b-2 border-[#FFC80A]' : 'text-gray-300'}`}
            >
              زنجیرە فیلم 🎬
            </button>
            <button
              onClick={() => { setActiveTab('kurdish'); setSearchQuery(''); }}
              className={`hover:text-[#FFC80A] transition-colors py-1 ${activeTab === 'kurdish' ? 'text-[#FFC80A] border-b-2 border-[#FFC80A]' : 'text-gray-300'}`}
            >
              بەرهەمی کوردی
            </button>
            <button
              onClick={onOpenRequestModal}
              className="text-gray-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1 rounded-md text-xs"
            >
              داواکردنی فیلم ؟
            </button>
          </nav>

          {/* Search Inputs */}
          <div className="relative">
            <input
              type="text"
              placeholder="گەڕان بۆ فیلم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 focus:border-[#FFC80A] focus:outline-none text-white text-xs py-1.5 pr-8 pl-3 rounded-full w-48 focus:w-64 transition-all duration-300 text-right rtl-dir"
            />
            <Search className="w-3.5 h-3.5 text-gray-500 absolute top-2.5 right-3" />
          </div>
        </div>

        {/* Right Side: Branded Logo (Matches beautiful yellow/white SC layout) */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col text-right">
            <span className="font-sans font-extrabold text-sm md:text-base leading-tight tracking-wider text-white">
              SHEA <span className="text-[#FFC80A]">CINEMA</span>
            </span>
            <span className="text-[9px] text-[#FFC80A] tracking-emerald uppercase font-semibold text-left">
              EST. 2026
            </span>
          </div>

          {/* Inline SVG Logo to match screenshot Image 1 (SC letters) */}
          <div className="relative w-10 h-10 md:w-11 md:h-11">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Yellow S Letter */}
              <path
                d="M50 32C40 32 32 38 32 45C32 52 40 54 50 56C58 58 64 60 64 68C64 76 56 82 45 82C32 82 24 75 22 68H34C36 71 40 74 45 74C50 74 53 72 53 68C53 64 48 62 40 60C30 58 22 55 22 45C22 35 32 28 45 28C56 28 64 34 66 40H54C52 36 50 32 50 32Z"
                fill="#FFC80A"
              />
              {/* White Outline/White colored C Letter */}
              <path
                d="M85 36H73C75 40 76 45 76 50C76 55 75 60 73 64H85C87 60 88 55 88 50C88 45 87 40 85 36ZM73 28C85 28 94 38 94 50C94 62 85 72 73 72V64C81 64 86 58 86 50C86 42 81 36 73 36V28Z"
                fill="#FFFFFF"
                fillOpacity="0.9"
              />
            </svg>
          </div>
        </div>

      </div>

      {/* Mobile Search and Link Bar */}
      <div className="lg:hidden mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2 rtl-dir">
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 text-xs">
          <button
            onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
            className={`px-2 py-1 ${activeTab === 'home' ? 'text-[#FFC80A] font-semibold' : 'text-gray-400'}`}
          >
            سەرەتا
          </button>
          <button
            onClick={() => { setActiveTab('movies'); setSearchQuery(''); }}
            className={`px-2 py-1 ${activeTab === 'movies' ? 'text-[#FFC80A] font-semibold' : 'text-gray-400'}`}
          >
            فیلمەکان
          </button>
          <button
            onClick={() => { setActiveTab('series'); setSearchQuery(''); }}
            className={`px-2 py-1 ${activeTab === 'series' ? 'text-[#FFC80A] font-semibold' : 'text-gray-400'}`}
          >
            زنجیرەکان
          </button>
          <button
            onClick={() => { setActiveTab('korean'); setSearchQuery(''); }}
            className={`px-2 py-1 ${activeTab === 'korean' ? 'text-[#FFC80A] font-semibold' : 'text-gray-400'}`}
          >
            کۆراوەکان
          </button>
          <button
            onClick={() => { setActiveTab('collections'); setSearchQuery(''); }}
            className={`px-2 py-1 ${activeTab === 'collections' ? 'text-[#FFC80A] font-semibold' : 'text-gray-400'}`}
          >
            زنجیرە فیلم
          </button>
          <button
            onClick={() => { setActiveTab('kurdish'); setSearchQuery(''); }}
            className={`px-2 py-1 ${activeTab === 'kurdish' ? 'text-[#FFC80A] font-semibold' : 'text-gray-400'}`}
          >
            بەرهەم کوردستان
          </button>
          <button
            onClick={onOpenRequestModal}
            className="text-[#FFC80A] bg-white/5 border border-white/10 px-2 py-0.5 rounded"
          >
            داواکردن
          </button>
        </div>

        <div className="relative w-36">
          <input
            type="text"
            placeholder="بگەڕێ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border border-white/10 focus:border-[#FFC80A] focus:outline-none text-white text-[11px] py-1 pr-7 pl-2 rounded-full w-full text-right"
          />
          <Search className="w-3 h-3 text-gray-500 absolute top-2 right-2.5" />
        </div>
      </div>
    </header>
  );
}
