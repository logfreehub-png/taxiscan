"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiGet, apiPost, notificationsWsUrl } from "@/lib/api/client";
import { Bell, X, Megaphone, Clock, Gift, Info, ChevronRight } from "lucide-react";

interface Notif {
  id: number;
  kind: string;
  title: string;
  preview?: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const KIND_ICON: Record<string, any> = {
  news: Megaphone, reminder: Clock, promo: Gift, admin: Megaphone, info: Info,
};

const POLL_MS = 25_000; // zaxira (WebSocket asosiy)

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<Notif | null>(null);
  const [detail, setDetail] = useState<Notif | null>(null);
  const [mounted, setMounted] = useState(false);
  const seenTop = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const openDetail = (n: Notif) => {
    setDetail(n);
    setOpen(false);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  const load = async () => {
    try {
      const raw = await apiGet<any>("/auth/notifications/");
      const list: Notif[] = Array.isArray(raw) ? raw : raw?.results ?? [];
      setItems(list);
      setUnread(list.filter((n) => !n.is_read).length);
      if (list.length) seenTop.current = list[0].id;
    } catch {
      /* ignore */
    }
  };

  // Banner ko'rsatish (yangi xabar kelganda)
  const showBanner = (n: Notif) => {
    setBanner(n);
    setTimeout(() => setBanner(null), 6000);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS); // zaxira poll

    // Real-time WebSocket
    let ws: WebSocket | null = null;
    let closedByUs = false;
    let retry: any = null;
    const connect = () => {
      const url = notificationsWsUrl();
      if (!url) return;
      try {
        ws = new WebSocket(url);
        ws.onmessage = (e) => {
          try {
            const n: Notif = JSON.parse(e.data);
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
            setUnread((u) => u + 1);
            showBanner(n);
          } catch { /* ignore */ }
        };
        ws.onclose = () => {
          if (!closedByUs) retry = setTimeout(connect, 4000); // qayta ulanish
        };
        ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
      } catch { /* ignore */ }
    };
    connect();

    return () => {
      clearInterval(t);
      closedByUs = true;
      if (retry) clearTimeout(retry);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    try {
      await apiPost("/auth/notifications/mark-read/", {});
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const openPanel = () => {
    setOpen((v) => !v);
    if (!open && unread > 0) markAll();
  };

  return (
    <>
      {/* Tepadagi banner — ilova ochiq bo'lsa ham yangi xabar kelganda chiqadi.
          Portal orqali body'ga chiqariladi (TopBar backdrop-blur ichida fixed buzilmasligi uchun). */}
      {mounted && banner && createPortal((() => {
        const BIcon = KIND_ICON[banner.kind] || Bell;
        return (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-sm animate-slide-up">
            <button
              onClick={() => { openDetail(banner); setBanner(null); }}
              className="w-full text-left rounded-2xl bg-[rgb(var(--surface))] border border-ink-line shadow-2xl ring-1 ring-brand/40 overflow-hidden hover:shadow-brand/20 transition"
            >
              <div className="h-1 bg-brand" />
              <div className="p-3.5 flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-ink shadow-sm">
                  <BIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Yangi bildirishnoma</span>
                  </div>
                  <div className="font-extrabold text-ink text-sm truncate mt-0.5">{banner.title}</div>
                  {(banner.preview || banner.body) && (
                    <div className="text-xs text-ink-muted line-clamp-2 mt-0.5">{banner.preview || banner.body}</div>
                  )}
                </div>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); setBanner(null); }}
                  className="text-ink-muted hover:text-ink p-0.5"
                >
                  <X size={16} />
                </span>
              </div>
            </button>
          </div>
        );
      })(), document.body)}

      <div className="relative" ref={boxRef}>
        <button onClick={openPanel} className="btn-ghost relative" aria-label="Bildirishnomalar">
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-auto card p-0 z-40 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-line sticky top-0 bg-[rgb(var(--surface))]">
              <span className="font-bold text-ink text-sm">Bildirishnomalar</span>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-muted">Bildirishnoma yo'q</div>
            ) : (
              <div className="divide-y divide-ink-line">
                {items.map((n) => {
                  const Icon = KIND_ICON[n.kind] || Info;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openDetail(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition ${!n.is_read ? "bg-brand/5" : ""} hover:bg-ink-line/20`}
                    >
                      <Icon size={16} className="text-brand-700 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink truncate">{n.title}</div>
                        {(n.preview || n.body) && (
                          <div className="text-xs text-ink-muted mt-0.5 line-clamp-1">{n.preview || n.body}</div>
                        )}
                        <div className="text-[10px] text-ink-muted mt-1 flex items-center gap-1">
                          {new Date(n.created_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          {n.body && <span className="text-brand-700 font-semibold">· batafsil</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-ink-muted self-center shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BATAFSIL — alohida oyna (modal), portal orqali body markazida */}
      {mounted && detail && createPortal((() => {
        const DIcon = KIND_ICON[detail.kind] || Info;
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setDetail(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-md rounded-2xl bg-[rgb(var(--surface))] border border-ink-line shadow-2xl overflow-hidden animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1.5 bg-brand" />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-ink">
                    <DIcon size={24} />
                  </div>
                  <button onClick={() => setDetail(null)} className="text-ink-muted hover:text-ink p-1"><X size={20} /></button>
                </div>
                <h3 className="text-xl font-extrabold text-ink mt-4">{detail.title}</h3>
                <div className="text-xs text-ink-muted mt-1">
                  {new Date(detail.created_at).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {detail.preview && <p className="text-sm font-semibold text-ink mt-4">{detail.preview}</p>}
                {detail.body && <p className="text-sm text-ink-muted leading-relaxed mt-2 whitespace-pre-line">{detail.body}</p>}
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </>
  );
}
