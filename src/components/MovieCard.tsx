import React from "react";
import { Film, Star, Play } from "lucide-react";
import { Movie } from "../types";

export interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect }) => {
  // Safe Image fallback
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null; // Prevent looping
    // Fallback back cover canvas using standard inline placeholder style
    e.currentTarget.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop";
  };

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-stone-800 bg-[#121214] transition-all hover:border-yellow-500/40 hover:shadow-[0_8px_30px_rgb(234,179,8,0.1)] duration-300"
    >
      {/* Poster Wraps */}
      <div className="relative aspect-[2/3] overflow-hidden bg-stone-900">
        {/* Poster Image */}
        <img
          src={movie.posterUrl}
          alt={movie.title}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500"
        />

        {/* Shadow overlays on bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-90" />

        {/* Hover Hover layout overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 text-stone-950 transition-transform scale-90 group-hover:scale-100 duration-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
            <Play size={24} className="fill-current ml-1" />
          </div>
        </div>

        {/* Rating badge - Yellow style */}
        {movie.rating && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded bg-stone-950/80 border border-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur-md">
            <Star size={11} className="fill-current stroke-none" />
            <span>{movie.rating}</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 right-3 rounded bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-stone-950 uppercase tracking-widest font-sans">
          {movie.category}
        </div>
      </div>

      {/* Meta Content bar */}
      <div className="p-3.5 text-right rtl-dir">
        <h3 className="truncate font-sans text-sm font-semibold text-stone-100 group-hover:text-yellow-400 transition-colors">
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400">
          <span className="font-sans text-stone-500">
            {movie.genre ? movie.genre.split(",")[0] : "دیارینەکراو"}
          </span>
          <span className="font-mono text-stone-300 font-medium">{movie.year}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
