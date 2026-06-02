import { Play, Calendar, Clock, Star, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface FeaturedBannerProps {
  movie: Movie | null;
  onSelectMovie: (movie: Movie) => void;
  currentIndex: number;
  totalCount: number;
  onChangeIndex: (index: number) => void;
}

export function FeaturedBanner({
  movie,
  onSelectMovie,
  currentIndex,
  totalCount,
  onChangeIndex,
}: FeaturedBannerProps) {
  if (!movie) return null;

  const handleNext = () => {
    onChangeIndex((currentIndex + 1) % totalCount);
  };

  const handlePrev = () => {
    onChangeIndex((currentIndex - 1 + totalCount) % totalCount);
  };

  return (
    <div className="relative w-full h-[65vh] md:h-[70vh] select-none rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f0f0f]">
      {/* Background Banner Image with Responsive Cover - Animated Crossfade */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={movie.id}
            src={movie.bannerUrl || movie.posterUrl}
            alt={movie.titleKurdish}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.35]"
          />
        </AnimatePresence>
      </div>

      {/* Double-direction Dark vignette overlays (bottom up, side horizontal to match UI) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-black/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/20 to-transparent hidden md:block pointer-events-none" />

      {/* Hero content aligned to the right (RTL support) */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 text-right rtl-dir max-w-5xl md:ml-auto select-text">
        <AnimatePresence mode="wait">
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.45 }}
            className="space-y-4 max-w-2xl md:ml-auto"
          >
            
            {/* Active Banner Indicator badge */}
            <span className="inline-flex items-center gap-1 bg-[#FFC80A] text-black font-black text-[10px] md:text-xs px-2.5 py-1 rounded uppercase shadow-md shadow-[#FFC80A]/10">
              <Film className="w-3.5 h-3.5 stroke-3 animate-pulse" />
              ترێندینگی ئێستا
            </span>

            {/* Titles */}
            <div className="space-y-1">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-md">
                {movie.titleKurdish}
              </h1>
              <p className="text-sm md:text-base text-amber-400 font-mono tracking-wider font-semibold opacity-90">
                {movie.titleEnglish} • {movie.category}
              </p>
            </div>

            {/* Stats Badges row */}
            <div className="flex flex-wrap items-center justify-start gap-4 text-xs md:text-sm pt-1">
              <span className="flex items-center gap-1.5 text-gray-300 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <Calendar className="w-4 h-4 text-gray-400" />
                {movie.year}
              </span>

              <span className="flex items-center gap-1.5 text-gray-300 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <Clock className="w-4 h-4 text-gray-400" />
                {movie.duration}
              </span>

              <span className="flex items-center gap-1 bg-white/5 backdrop-blur-md text-[#FFC80A] px-3 py-1.5 rounded-lg border border-white/10 font-bold">
                {movie.rating.toFixed(1)} / ١٠
                <Star className="w-4 h-4 text-[#FFC80A] fill-[#FFC80A]" />
              </span>
            </div>

            {/* Description plot block */}
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed md:line-clamp-3 line-clamp-2 max-w-xl pb-2 bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/5">
              {movie.description || "سەیر بکە لە نوێترین پلاتفۆرمی شیا سینەما بە بەرزترین کوالێتی و خێراترین سێرڤەری پەخشکردن لە جیهاندا."}
            </p>

            {/* Play CTA action */}
            <div className="pt-2 select-none">
              <button
                onClick={() => onSelectMovie(movie)}
                className="group flex items-center justify-center gap-2 bg-[#FFC80A] hover:bg-[#E2B200] text-black font-black text-xs md:text-sm px-6 md:px-8 py-3 rounded-xl shadow-xl shadow-[#FFC80A]/10 transition-all duration-300 hover:scale-105"
              >
                <Play className="w-4 h-4 fill-black text-black group-hover:scale-110 transition-transform" />
                <span>پێشاندانی فیلمەکە و لێدان</span>
              </button>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Navigation Controls and Indicators on bottom-left */}
      {totalCount > 1 && (
        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 flex flex-col items-center gap-3 z-10 select-none">
          {/* Manual Arrow Controls */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1 border border-white/10 rounded-full">
            <button
              onClick={handlePrev}
              type="button"
              className="p-1 px-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs flex items-center justify-center cursor-pointer"
              title="پێشتر"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-mono font-bold text-gray-300 px-1 select-none">
              {currentIndex + 1} / {totalCount}
            </div>
            <button
              onClick={handleNext}
              type="button"
              className="p-1 px-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs flex items-center justify-center cursor-pointer"
              title="دواتر"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dots bar indicator */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onChangeIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex 
                    ? "w-6 bg-[#FFC80A]" 
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Slide slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
