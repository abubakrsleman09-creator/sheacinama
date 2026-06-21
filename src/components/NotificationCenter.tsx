import React, { useState, useRef, useEffect } from "react";
import { Bell, BellRing, Check, CheckCheck, Trash2, Info, Heart, Sparkles, Film, X, CircleDot } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";

interface NotificationCenterProps {
  user: FirebaseUser | null;
}

export default function NotificationCenter({ user }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync real-time notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Sync user-specific notifications or site-wide announcements
    const q1 = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "public"]),
      limit(40)
    );

    const unsubscribe = onSnapshot(q1, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((snap) => {
        items.push({ id: snap.id, ...snap.data() });
      });

      // Sort notifications locally by createdAt descending
      items.sort((a, b) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      setNotifications(items);
    }, (err) => {
      console.warn("Notifications sync error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Click outside closes popover helper
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const notificationRef = doc(db, "notifications", id);
      await updateDoc(notificationRef, { isRead: true });
    } catch (err) {
      console.error("Mark as read failed:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.isRead) {
          batch.update(doc(db, "notifications", n.id), { isRead: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Mark all as read failed:", err);
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    if (!window.confirm("ئایا دڵنیایت لە پاککردنەوەی هەموو ئاگادارییەکانت؟")) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, "notifications", n.id));
      });
      await batch.commit();
      setIsOpen(false);
    } catch (err) {
      console.error("Clear notifications failed:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart size={14} className="text-red-500 fill-red-500/20 shrink-0" />;
      case "movie_added":
        return <Film size={14} className="text-yellow-500 shrink-0" />;
      case "system":
        return <Sparkles size={14} className="text-purple-400 shrink-0" />;
      case "info":
      default:
        return <Info size={14} className="text-sky-400 shrink-0" />;
    }
  };

  return (
    <div className="relative ltr-dir" ref={containerRef}>
      {/* Target Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-10 w-10 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-stone-900 border-stone-700 text-yellow-400"
            : "bg-[#141416] border-stone-800 text-stone-400 hover:text-white"
        }`}
        title="ئاگادارکردنەوەکان"
      >
        {unreadCount > 0 ? (
          <BellRing size={20} className="animate-[swing_0.8s_ease-out_infinite] text-yellow-400 fill-yellow-400/15" />
        ) : (
          <Bell size={20} />
        )}

        {/* Counter red dot badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-black font-mono">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Panel Box */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 origin-top-right rounded-2xl border border-stone-800 bg-[#0c0c0e] p-4 shadow-2xl ring-1 ring-black/5 focus:outline-none z-[100] text-right rtl-dir">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-stone-850 pb-3 mb-3">
            <h4 className="text-xs font-black text-white font-sans flex items-center gap-1.5 justify-end">
              <span>ئاگادارکردنەوە تایبەتییەکان</span>
              <span className="rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-[9px] font-bold text-yellow-500 font-mono">
                {unreadCount} نوێ
              </span>
            </h4>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-stone-900 transition cursor-pointer"
                  title="سڕینەوەی هەمووی"
                >
                  <Trash2 size={13} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1 rounded text-stone-500 hover:text-yellow-400 hover:bg-stone-900 transition cursor-pointer"
                    title="هەمووی بخوێنەوە"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Interactive Notifications feed */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 text-right">
            {!user ? (
              <div className="text-center py-6 text-stone-500 text-[11px] font-sans">
                لۆگین بکە بۆ ئەوەی ئاگادارکردنەوەکانت مێژوویی بریتە لێرەدا پاشەکەوت بێت.
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-[11px] font-sans">
                هیچ ئاگادارکردنەوەیەک نییە لەم ساتەدا.
              </div>
            ) : (
              notifications.map((n) => {
                const date = n.createdAt
                  ? n.createdAt.seconds
                    ? new Date(n.createdAt.seconds * 1000)
                    : new Date(n.createdAt)
                  : new Date();
                const formattedTime = date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false
                });

                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border transition duration-200 flex items-start gap-3 relative ${
                      n.isRead
                        ? "bg-[#08080a]/40 border-stone-900/60 text-stone-400"
                        : "bg-yellow-500/5 border-yellow-500/10 text-stone-200"
                    }`}
                  >
                    {/* Icon mapping type color and shape */}
                    <div className="mt-0.5">{getNotificationIcon(n.type)}</div>

                    {/* Meta and Copy */}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between flex-row-reverse gap-2">
                        <span className="text-[9px] text-stone-500 font-mono">{formattedTime}</span>
                        <h5 className="font-bold text-[11px] truncate">{n.title}</h5>
                      </div>
                      <p className="text-[10px] leading-relaxed font-sans opacity-90 break-words">{n.message}</p>
                    </div>

                    {/* Unread circle marker / action check button trigger */}
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="h-5 w-5 rounded bg-stone-900 border border-stone-850 flex items-center justify-center text-stone-500 hover:text-yellow-400 absolute bottom-2 left-2 cursor-pointer transition opacity-0 group-hover:opacity-100 sm:opacity-100"
                        title="دیاریکردن وەک خوێنراوەتەوە"
                      >
                        <Check size={11} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
