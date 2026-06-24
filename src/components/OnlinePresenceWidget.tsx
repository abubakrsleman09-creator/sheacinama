import React, { useState } from "react";
import { Users, ChevronUp, ChevronDown, Activity, Globe, Monitor, Smartphone, Laptop } from "lucide-react";

interface OnlineUser {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  photoURL?: string;
  lastActive: string;
  userAgent?: string;
  enteredAt?: string;
}

interface OnlinePresenceWidgetProps {
  onlineUsers: OnlineUser[];
  isAdmin?: boolean;
}

export default function OnlinePresenceWidget({ onlineUsers, isAdmin = false }: OnlinePresenceWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse user-agent for display
  const getDeviceIcon = (ua?: string) => {
    if (!ua) return <Globe size={11} className="text-stone-500" />;
    const lower = ua.toLowerCase();
    if (lower.includes("mobi") || lower.includes("android") || lower.includes("iphone")) {
      return <Smartphone size={11} className="text-yellow-500" />;
    }
    if (lower.includes("macintosh") || lower.includes("windows")) {
      return <Laptop size={11} className="text-emerald-400" />;
    }
    return <Monitor size={11} className="text-stone-400" />;
  };

  const getDeviceName = (ua?: string) => {
    if (!ua) return "وێب";
    const lower = ua.toLowerCase();
    if (lower.includes("iphone")) return "iPhone";
    if (lower.includes("android")) return "Android";
    if (lower.includes("windows")) return "Windows";
    if (lower.includes("macintosh")) return "Mac";
    if (lower.includes("linux")) return "Linux";
    return "سەردانکەر";
  };

  const activeCount = onlineUsers.length;

  return (
    <div
      id="floating-presence-widget"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 text-right"
    >
      {/* Expanded User Details Overlay Tooltip (Admin Only) */}
      {isOpen && isAdmin && (
        <div
          id="presence-expanded-overlay"
          className="w-72 max-h-80 rounded-2xl border border-stone-850 bg-[#0a0a0c]/95 backdrop-blur-xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.7)] animate-in fade-in-50 slide-in-from-bottom-5 duration-200 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-stone-850 pb-2.5 mb-2.5 flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h4 className="text-xs font-black text-stone-200 font-sans">بینەرانی سەر هێڵ</h4>
            </div>
            <span className="text-[10px] text-stone-500 font-mono">Real-time</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-right">
            {onlineUsers.length === 0 ? (
              <p className="text-[10px] text-stone-500 font-sans text-center py-4">هیچ بینەرێک دیار نییە</p>
            ) : (
              onlineUsers.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-stone-900/50 border border-stone-850/60 flex-row-reverse hover:bg-stone-900 transition-colors"
                >
                  {/* User Profile info */}
                  <div className="flex items-center gap-2 flex-row-reverse min-w-0">
                    {item.photoURL ? (
                      <img
                        src={item.photoURL}
                        alt=""
                        className="h-6 w-6 rounded-full border border-stone-800 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-stone-800 border border-stone-750 flex items-center justify-center text-[10px] font-bold text-stone-300 shrink-0">
                        {item.userName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-stone-300 truncate max-w-[120px] font-sans">
                      {item.userName}
                    </span>
                  </div>

                  {/* Device and status indicator */}
                  <div className="flex items-center gap-1.5 flex-row-reverse shrink-0">
                    {getDeviceIcon(item.userAgent)}
                    <span className="text-[8px] text-stone-500 font-mono">
                      {getDeviceName(item.userAgent)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating Pill Toggle Button */}
      {isAdmin ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 rounded-full bg-[#0a0a0c] hover:bg-[#111115] border border-stone-800 hover:border-emerald-500/40 text-stone-200 hover:text-white px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 cursor-pointer select-none flex-row-reverse text-xs font-bold font-sans"
        >
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-row-reverse">
            <Users size={13} className="text-stone-400 shrink-0" />
            <span>ئێستا {activeCount} بینەر لەسەر هێڵن</span>
          </div>

          {isOpen ? (
            <ChevronDown size={12} className="text-stone-500 shrink-0 transition-transform duration-200" />
          ) : (
            <ChevronUp size={12} className="text-stone-500 shrink-0 transition-transform duration-200" />
          )}
        </button>
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-full bg-[#0a0a0c] border border-stone-850 text-stone-300 px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] select-none flex-row-reverse text-xs font-semibold font-sans"
        >
          <div className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-row-reverse">
            <Users size={12} className="text-stone-500 shrink-0" />
            <span>ئێستا {activeCount} بینەر لەسەر هێڵن</span>
          </div>
        </div>
      )}
    </div>
  );
}
