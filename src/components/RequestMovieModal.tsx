import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Film, Tv, CheckCircle } from 'lucide-react';
import { ContentType } from '../types';

interface RequestMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export function RequestMovieModal({ isOpen, onClose, onSubmitSuccess }: RequestMovieModalProps) {
  const [movieTitle, setMovieTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('movie');
  const [requesterName, setRequesterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) {
      setError('تکایە ناوی فیلم یان زنجیرەکە بنووسە');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle,
          contentType,
          requesterName: requesterName.trim() || 'سەردانکەر'
        })
      });

      if (!response.ok) {
        throw new Error('کێشەیەک لە ڕاژەکار ڕوویدا');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setMovieTitle('');
        setRequesterName('');
        onSubmitSuccess();
        onClose();
      }, 2500);

    } catch (err) {
      setError('شکستی هێنا لە ناردنی داواکاری، جارێکی تر تاقی بکەرەوە.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 text-right rtl-dir"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                داواکردنی film و زنجیرەی نوێ 🍿
              </h3>
            </div>

            {/* Content Area */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <CheckCircle className="w-16 h-16 text-[#FFC80A] mb-4 stroke-2" />
                    <h4 className="text-lg font-bold text-white mb-2">داواکارییەکەت نێردرا!</h4>
                    <p className="text-xs text-gray-400 max-w-xs">
                      ئەدمینی شیا سینەما داواکاری کەت دەبینێت و لە زووترین کاتدا پۆستی دەکەین.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-4 text-right"
                  >
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center" id="request-error">
                        {error}
                      </div>
                    )}

                    {/* Movie/Series Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        جۆری ناوەڕۆک
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setContentType('movie')}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                            contentType === 'movie'
                              ? 'bg-[#FFC80A] text-black border-[#FFC80A]'
                              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Film className="w-4 h-4" />
                          فیلم
                        </button>
                        <button
                          type="button"
                          onClick={() => setContentType('series')}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                            contentType === 'series'
                              ? 'bg-[#FFC80A] text-black border-[#FFC80A]'
                              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Tv className="w-4 h-4" />
                          زنجیرە
                        </button>
                      </div>
                    </div>

                    {/* Movie Title */}
                    <div>
                      <label htmlFor="request-title-input" className="block text-xs font-semibold text-gray-300 mb-2">
                        ناوی فیلم یان زنجیرە (کوردی یان ئینگلیزی) *
                      </label>
                      <input
                        id="request-title-input"
                        type="text"
                        required
                        placeholder="بۆ نموونە: Interstellar"
                        value={movieTitle}
                        onChange={(e) => setMovieTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-[#FFC80A] focus:outline-none text-white text-xs px-3 py-2.5 rounded-lg text-right"
                      />
                    </div>

                    {/* Requester Name */}
                    <div>
                      <label htmlFor="requester-name-input" className="block text-xs font-semibold text-gray-300 mb-2">
                        ناوی تۆ (ئارەزوومەندانە)
                      </label>
                      <input
                        id="requester-name-input"
                        type="text"
                        placeholder="ناوی خۆت لێرە بنووسە"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-[#FFC80A] focus:outline-none text-white text-xs px-3 py-2.5 rounded-lg text-right"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#FFC80A] hover:bg-[#E2B200] text-black font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-6 shadow-lg shadow-[#FFC80A]/5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmitting ? 'داواکاری دەنێردرێت...' : 'ناردنی داواکاری'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
