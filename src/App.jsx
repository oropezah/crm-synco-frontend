import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Send, MoreVertical, RefreshCw, CheckCheck, Clock, Wifi, WifiOff, Bell } from 'lucide-react';

/* ───────── Config de CRM (nuevo) ───────── */
const STAGES = [
  { id: "nuevo", label: "Nuevo", emoji: "🆕", hue: "56,189,248" },
  { id: "calificado", label: "Calificado", emoji: "🎯", hue: "167,139,250" },
  { id: "cita", label: "Cita", emoji: "📅", hue: "52,211,153" },
  { id: "cerrado", label: "Cerrado", emoji: "💰", hue: "250,204,21" },
  { id: "perdido", label: "Perdido", emoji: "💤", hue: "148,163,184" },
];
const TEMPLATES = [
  { e: "👋", t: "Saludo", m: "¡Hola! 👋 Soy Sofía de Synco. Vi que nos escribiste, ¿en qué te puedo ayudar?" },
  { e: "🩺", t: "Calificar", m: "Para ayudarte mejor: ¿cuál es tu especialidad y cuántas citas manejas al mes?" },
  { e: "📅", t: "Agendar", m: "¡Perfecto! 📅 ¿Te parece si agendamos una llamada corta de 15 min esta semana?" },
  { e: "⏰", t: "Seguimiento", m: "¡Hola! Te escribo para dar seguimiento 🙌 ¿pudiste revisar lo que te comenté?" },
  { e: "💬", t: "WhatsApp", m: "¿Me compartes tu WhatsApp para enviarte la información completa?" },
];
const FOLLOW = [{ l: "1h", ms: 36e5 }, { l: "24h", ms: 864e5 }, { l: "3d", ms: 2592e5 }];
const FLOATERS = [
  { e: "✨", x: "8%", y: "18%", d: "0s", s: 22 }, { e: "💬", x: "88%", y: "14%", d: "-4s", s: 26 },
  { e: "🚀", x: "78%", y: "72%", d: "-8s", s: 24 }, { e: "🩺", x: "14%", y: "78%", d: "-2s", s: 24 },
  { e: "⚡", x: "52%", y: "88%", d: "-6s", s: 20 }, { e: "💎", x: "60%", y: "8%", d: "-10s", s: 20 },
];

const CSS = `
:root{--ease-out:cubic-bezier(.23,1,.32,1);--ease-io:cubic-bezier(.77,0,.175,1);--spring:cubic-bezier(.32,.72,0,1)}
.crm{font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-.005em}
.glass{position:relative;background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.03) 60%);backdrop-filter:blur(28px) saturate(190%);-webkit-backdrop-filter:blur(28px) saturate(190%);border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(255,255,255,.04),inset 0 0 22px rgba(255,255,255,.03),0 14px 44px rgba(0,0,0,.45)}
.glass::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.16),transparent 38%);opacity:.5;mask:linear-gradient(#000,transparent 70%);-webkit-mask:linear-gradient(#000,transparent 70%)}
.glass-soft{background:rgba(255,255,255,.045);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}
.pressable{transition:transform 160ms var(--ease-out),background-color 200ms ease,border-color 200ms ease,box-shadow 200ms ease}
.pressable:active{transform:scale(.97)}
@media (hover:hover) and (pointer:fine){.pressable:hover{background-color:rgba(255,255,255,.1)}.lift:hover{transform:translateY(-1px)}}
.aurora{position:fixed;border-radius:9999px;filter:blur(130px);pointer-events:none;will-change:transform;animation:drift 26s var(--ease-io) infinite alternate}
@keyframes drift{to{transform:translate3d(70px,50px,0) scale(1.15)}}
.floater{position:fixed;pointer-events:none;opacity:.22;filter:drop-shadow(0 0 14px rgba(34,211,238,.45));animation:floaty 14s ease-in-out infinite;will-change:transform}
@keyframes floaty{0%,100%{transform:translate3d(0,0,0) rotate(-6deg)}50%{transform:translate3d(14px,-34px,0) rotate(8deg)}}
.row-in{opacity:0;animation:rowIn 320ms var(--ease-out) forwards}
@keyframes rowIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.msg-in{animation:msgIn 240ms var(--ease-out) both}
@keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
.wave{display:inline-block;transform-origin:70% 70%;animation:wave 2.6s ease-in-out infinite}
@keyframes wave{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(16deg)}20%,40%{transform:rotate(-10deg)}50%{transform:rotate(8deg)}}
.flame{display:inline-block;animation:flame 1.1s ease-in-out infinite;transform-origin:50% 90%}
@keyframes flame{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.2) rotate(4deg)}}
.bob{display:inline-block;animation:bob 2.4s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.pop{animation:pop 380ms var(--spring) both}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.shimmer{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shim 1.3s linear infinite}
@keyframes shim{to{background-position:-200% 0}}
.dot{width:6px;height:6px;border-radius:9999px;background:#a5f3fc;animation:dot 1s ease-in-out infinite}
.dot:nth-child(2){animation-delay:.15s}.dot:nth-child(3){animation-delay:.3s}
@keyframes dot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}
.ring{animation:ring 2s ease-out infinite}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(34,211,238,.55)}100%{box-shadow:0 0 0 10px rgba(34,211,238,0)}}
.toast{animation:toast 280ms var(--spring) both}
@keyframes toast{from{opacity:0;transform:translate(-50%,16px) scale(.96)}to{opacity:1;transform:translate(-50%,0)}}
.scroll::-webkit-scrollbar{width:6px}.scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:9px}
@media (prefers-reduced-motion:reduce){.aurora,.floater,.wave,.flame,.bob,.ring,.shimmer{animation:none!important}.row-in,.msg-in,.pop,.toast{animation:fadeOnly 200ms ease both!important}@keyframes fadeOnly{from{opacity:0}to{opacity:1}}}
`;

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [inputMsg, setInputMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [meta, setMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem("synco_crm_meta") || "{}"); } catch { return {}; }
  });

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Obtener las credenciales limpias
  const rawToken = import.meta.env.VITE_META_TOKEN || process.env.REACT_APP_META_TOKEN || "";
  const rawPageId = import.meta.env.VITE_META_PAGE_ID || process.env.REACT_APP_META_PAGE_ID || "me";
  const token = rawToken.replace(/['"]/g, '').trim();
  const pageId = rawPageId.replace(/['"]/g, '').trim();

  const showToast = (text) => { setToast({ text, id: Date.now() }); setTimeout(() => setToast(null), 2200); };
  const patchMeta = (id, patch) => setMeta(m => {
    const next = { ...m, [id]: { ...(m[id] || {}), ...patch } };
    try { localStorage.setItem("synco_crm_meta", JSON.stringify(next)); } catch {}
    return next;
  });

  // 1. Cargar historial de conversaciones desde Instagram
  const fetchMetaConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("No se encontró el TOKEN en el archivo .env");

      const targetId = pageId || "me";
      const instagramUrl = `https://graph.instagram.com/v19.0/${targetId}/conversations?fields=participants{id,username,name},messages{message,created_time,from{id,username}},updated_time,unread_count&access_token=${token}`;

      const response = await fetch(instagramUrl);
      const data = await response.json();

      if (data.error) throw new Error(data.error.message || "Error al conectar con Instagram API");

      const formattedConvs = (data.data || []).map((conv, idx) => {
        const participants = conv.participants?.data || [];

        // Filtrar cliente excluyendo nuestra propia cuenta
        const lead = participants.find(p =>
          p.id !== pageId &&
          p.username?.toLowerCase() !== "synco.ia" &&
          p.name?.toLowerCase() !== "synco.ia"
        ) || participants[0] || { name: `Cliente ${idx + 1}`, username: `cliente_${idx + 1}`, id: conv.id };

        const rawMsgs = conv.messages?.data || [];

        const messages = rawMsgs.map((m, mIdx) => {
          const senderId = m.from?.id;
          const senderUsername = m.from?.username?.toLowerCase();
          const isMe = senderId === pageId || senderUsername === "synco.ia";

          return {
            id: m.id || mIdx,
            sender: isMe ? "me" : "them",
            text: m.message || "",
            time: m.created_time
              ? new Date(m.created_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : "Ahora"
          };
        }).reverse();

        const lastMessageText = messages.length > 0 ? messages[messages.length - 1].text : "Sin mensajes";
        const leadUsername = lead.username || lead.name || "Usuario";

        return {
          id: conv.id,
          leadId: lead.id,
          name: leadUsername,
          ig_user: `@${leadUsername.toLowerCase().replace(/\s+/g, '_')}`,
          avatar: leadUsername.charAt(0).toUpperCase(),
          avatarBg: "from-teal-500 to-emerald-700",
          lastMsg: lastMessageText,
          lastSender: messages.length ? messages[messages.length - 1].sender : null,
          time: conv.updated_time ? new Date(conv.updated_time).toLocaleDateString() : "Hoy",
          unread: (conv.unread_count || 0) > 0,
          messages: messages
        };
      });

      setConversations(formattedConvs);
      if (formattedConvs.length > 0) setSelectedId(prev => prev || formattedConvs[0].id);
    } catch (err) {
      console.error("Instagram API Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Conectar al WebSocket de Python (server.py) para mensajes en vivo
  useEffect(() => {
    fetchMetaConversations();
    let closed = false;

    const connectWebSocket = () => {
      const ws = new WebSocket("wss://synco-backend-a7gm.onrender.com/ws");

      ws.onopen = () => {
        console.log("⚡ Conectado al WebSocket en Vivo de Python (server.py)");
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log("📩 Evento recibido vía WebSocket:", payload);
          if (payload.event === "new_message") {
            fetchMetaConversations(true); // refresco silencioso, sin parpadeo
            showToast("💬 Nuevo mensaje recibido");
          }
        } catch (e) {
          console.error("Error parseando WebSocket msg:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log("WebSocket desconectado, reintentando en 3s...");
        setWsConnected(false);
        if (!closed) setTimeout(connectWebSocket, 3000);
      };

      socketRef.current = ws;
    };

    connectWebSocket();

    return () => {
      closed = true;
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // reloj para seguimientos + atajo "/" para buscar
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    const k = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => { clearInterval(t); window.removeEventListener("keydown", k); };
  }, []);

  const activeConv = conversations.find(c => c.id === selectedId) || conversations[0];
  const am = (activeConv && meta[activeConv.id]) || {};

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); },
    [activeConv?.id, activeConv?.messages?.length]);

  // 3. Enviar mensaje real a través de Meta API
  const handleSend = async () => {
    if (!inputMsg.trim() || !activeConv || isSending) return;

    const messageText = inputMsg.trim();
    setInputMsg("");
    setIsSending(true);

    // Actualización optimista de UI
    const tempMsg = {
      id: Date.now(),
      sender: "me",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConv.id) {
        return { ...c, lastMsg: messageText, lastSender: "me", time: "Ahora", messages: [...c.messages, tempMsg] };
      }
      return c;
    }));

    try {
      const recipientId = activeConv.leadId || activeConv.id;
      const sendUrl = `https://graph.instagram.com/v19.0/${pageId}/messages?access_token=${token}`;

      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text: messageText } })
      });

      const resData = await res.json();
      if (resData.error) throw new Error(resData.error.message);

      console.log("✅ Mensaje enviado exitosamente:", resData);
      patchMeta(activeConv.id, { followAt: null }); // si respondes, se limpia el seguimiento
      showToast("✅ Mensaje enviado");
    } catch (err) {
      console.error("❌ Error enviando mensaje a Meta:", err);
      alert(`No se pudo enviar el mensaje: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const isDue = (id) => meta[id]?.followAt && meta[id].followAt <= now;
  const stats = useMemo(() => ({
    total: conversations.length,
    unread: conversations.filter(c => c.unread).length,
    pending: conversations.filter(c => c.lastSender === "them").length,
    due: conversations.filter(c => isDue(c.id)).length,
  }), [conversations, meta, now]);

  const filteredConvs = conversations.filter(c => {
    if (filter === "sin_responder") return c.unread;
    if (filter === "pendiente") return c.lastSender === "them";
    if (filter === "seguimiento") return !!meta[c.id]?.followAt;
    return true;
  }).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const stageOf = (id) => STAGES.find(s => s.id === (meta[id]?.stage || "nuevo"));

  return (
    <div className="crm flex h-screen w-screen bg-[#05060a] text-zinc-50 overflow-hidden selection:bg-cyan-500/30 relative">
      <style>{CSS}</style>

      {/* Fondo aurora + emojis flotantes */}
      <div className="aurora -top-40 -left-40 w-[620px] h-[620px] bg-cyan-500/25" />
      <div className="aurora -bottom-52 right-1/4 w-[720px] h-[720px] bg-indigo-600/25" style={{ animationDelay: "-9s" }} />
      <div className="aurora top-1/3 -right-40 w-[480px] h-[480px] bg-fuchsia-600/15" style={{ animationDelay: "-15s" }} />
      {FLOATERS.map((f, i) => (
        <span key={i} className="floater" style={{ left: f.x, top: f.y, fontSize: f.s, animationDelay: f.d }}>{f.e}</span>
      ))}

      {/* SIDEBAR IZQUIERDO */}
      <aside className="glass w-[340px] m-3 mr-0 rounded-3xl flex flex-col z-20 overflow-hidden">
        <div className="p-4 space-y-3.5 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-sm text-black shadow-lg shadow-cyan-500/30 ring">Ω</div>
              <div>
                <div className="font-semibold text-[15px] text-white leading-none">Synco Inbox</div>
                <div className="text-[11px] text-zinc-400 mt-1"><span className="wave">👋</span> Hola, Henry</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div title={wsConnected ? "WebSocket Python Conectado" : "Desconectado de Python (server.py)"} className="flex items-center gap-1 text-[11px]">
                {wsConnected
                  ? <><span className="bob">⚡</span><Wifi className="w-4 h-4 text-emerald-400" /></>
                  : <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />}
              </div>
              <button onClick={() => fetchMetaConversations()} className="pressable p-2 rounded-xl glass-soft text-zinc-300 hover:text-white" title="Recargar chats">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mini estadísticas */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Chats", v: stats.total, e: "💬" },
              { l: "Sin leer", v: stats.unread, e: "🔥", hot: stats.unread > 0 },
              { l: "Pendientes", v: stats.pending, e: "⏳" },
              { l: "Vencidos", v: stats.due, e: "🔔", hot: stats.due > 0 },
            ].map((s) => (
              <div key={s.l} className="glass-soft rounded-2xl py-2 text-center">
                <div className="text-base font-semibold text-white tabular-nums leading-none">
                  <span className={s.hot ? "flame mr-0.5" : "mr-0.5"}>{s.e}</span>{s.v}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar conversaciones…  ( / )"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-soft text-[13px] text-white placeholder-zinc-400 pl-10 pr-3 py-2.5 rounded-2xl focus:outline-none focus:border-cyan-400/60 transition-colors duration-200"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: "todos", label: "Todos", e: "📥" },
              { id: "sin_responder", label: "Sin leer", e: "🔥" },
              { id: "pendiente", label: "Pendientes", e: "⏳" },
              { id: "seguimiento", label: "Seguimiento", e: "🔔" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`pressable text-[12px] px-3 py-1.5 rounded-xl border whitespace-nowrap ${
                  filter === f.id
                    ? "bg-cyan-400/20 border-cyan-300/50 text-cyan-100 font-semibold shadow-[0_0_18px_rgba(34,211,238,.25)]"
                    : "bg-white/[0.04] border-white/10 text-zinc-300"
                }`}
              >
                {f.e} {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="scroll flex-1 overflow-y-auto p-2.5 space-y-2">
          {loading && [0, 1, 2, 3].map(i => <div key={i} className="shimmer h-[68px] rounded-2xl" />)}

          {error && (
            <div className="p-3.5 text-[13px] text-rose-200 bg-rose-500/15 border border-rose-400/30 rounded-2xl">⚠️ {error}</div>
          )}

          {!loading && !error && filteredConvs.length === 0 && (
            <div className="p-8 text-center text-[13px] text-zinc-400"><div className="text-3xl bob mb-2">🔍</div>Sin resultados</div>
          )}

          {!loading && filteredConvs.map((c, i) => {
            const isSelected = c.id === selectedId;
            const st = stageOf(c.id);
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={`row-in pressable lift group relative p-3 rounded-2xl cursor-pointer border ${
                  isSelected ? "bg-white/[0.12] border-white/25 shadow-[0_8px_30px_rgba(34,211,238,.12)]" : "bg-white/[0.035] border-white/[0.07]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${c.avatarBg} flex items-center justify-center font-bold text-sm text-white shadow-md shrink-0 relative`}>
                    {c.avatar}
                    {c.unread && <span className="absolute -top-1 -right-1 text-[13px] flame">🔥</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-[14px] font-semibold text-white truncate">{c.name}</h4>
                      <span className="text-[11px] text-zinc-400 ml-2 shrink-0">{c.time}</span>
                    </div>
                    <p className={`text-[12.5px] truncate mt-0.5 ${c.unread ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>{c.lastMsg}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: `rgba(${st.hue},.16)`, color: `rgb(${st.hue})` }}>{st.emoji} {st.label}</span>
                      {isDue(c.id) && <span className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 font-medium"><span className="flame">🔔</span> Seguir</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ÁREA CENTRAL */}
      <section className="glass flex-1 m-3 rounded-3xl flex flex-col z-10 overflow-hidden min-w-0">
        <header className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeConv && (
              <>
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${activeConv.avatarBg} flex items-center justify-center font-bold text-sm text-white shadow-md`}>{activeConv.avatar}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-semibold text-white">{activeConv.name}</h3>
                    <span className="text-[11.5px] bg-cyan-400/15 text-cyan-100 border border-cyan-300/30 px-2.5 py-0.5 rounded-full font-mono">{activeConv.ig_user}</span>
                  </div>
                  <p className="text-[12px] text-zinc-400 flex items-center gap-1.5 mt-1">
                    {wsConnected
                      ? <><span className="w-2 h-2 rounded-full bg-emerald-400 ring" /> Tiempo real activo</>
                      : <><Clock className="w-3.5 h-3.5" /> Sin conexión en vivo</>}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchMetaConversations()} className="pressable p-2.5 rounded-xl glass-soft text-zinc-300 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="pressable p-2.5 rounded-xl glass-soft text-zinc-300 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </header>

        {/* Historial de Mensajes */}
        <div className="scroll flex-1 overflow-y-auto p-6 space-y-4">
          {!activeConv && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm gap-2">
              <div className="text-5xl wave">👋</div>Selecciona una conversación
            </div>
          )}
          {activeConv?.messages?.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div key={msg.id} className={`msg-in flex flex-col ${isMe ? "items-end" : "items-start"} gap-1`}>
                <div
                  className={`max-w-[72%] px-4 py-3 rounded-3xl text-[14px] leading-relaxed ${
                    isMe
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_10px_30px_rgba(6,182,212,.3)] border border-white/25 rounded-br-lg"
                      : "glass-soft text-zinc-50 rounded-bl-lg"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <div className="flex items-center gap-1 px-1.5">
                  <span className="text-[11px] text-zinc-400">{msg.time}</span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />}
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="msg-in flex justify-end"><div className="bg-cyan-500/20 border border-cyan-300/30 rounded-3xl rounded-br-lg px-4 py-3 flex gap-1.5"><span className="dot" /><span className="dot" /><span className="dot" /></div></div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Caja de Envío */}
        <div className="p-4 border-t border-white/[0.08] space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TEMPLATES.map(t => (
              <button key={t.t} onClick={() => { setInputMsg(t.m); inputRef.current?.focus(); }}
                className="pressable text-[12px] px-3 py-1.5 rounded-xl glass-soft text-zinc-200 whitespace-nowrap">{t.e} {t.t}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 glass-soft rounded-2xl p-2 focus-within:border-cyan-300/60 transition-colors duration-200">
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe un mensaje…"
              value={inputMsg}
              disabled={isSending}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 bg-transparent text-[14px] text-white placeholder-zinc-400 focus:outline-none px-3 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !inputMsg.trim()}
              className="pressable bg-gradient-to-r from-cyan-400 to-blue-500 disabled:opacity-40 text-black font-semibold text-[13px] px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/30 flex items-center gap-1.5"
            >
              <span>{isSending ? "Enviando…" : "Enviar"}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* PANEL DEL LEAD (nuevo) */}
      {activeConv && (
        <aside className="glass hidden xl:flex w-[300px] my-3 mr-3 ml-0 rounded-3xl flex-col z-20 overflow-y-auto scroll p-4 gap-5">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br ${activeConv.avatarBg} flex items-center justify-center font-bold text-2xl shadow-xl pop`}>{activeConv.avatar}</div>
            <div className="mt-3 font-semibold text-[16px]">{activeConv.name}</div>
            <div className="text-[12px] text-zinc-400 font-mono">{activeConv.ig_user}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-semibold">Etapa del pipeline</div>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => {
                const on = (am.stage || "nuevo") === s.id;
                return (
                  <button key={s.id} onClick={() => { patchMeta(activeConv.id, { stage: s.id }); showToast(`${s.emoji} Movido a ${s.label}`); }}
                    className="pressable text-[12px] px-2.5 py-1.5 rounded-xl border font-medium"
                    style={on ? { background: `rgba(${s.hue},.22)`, borderColor: `rgba(${s.hue},.6)`, color: `rgb(${s.hue})` } : { background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "#d4d4d8" }}>
                    {s.emoji} {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-semibold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Seguimiento automático</div>
            <div className="flex gap-1.5">
              {FOLLOW.map(f => (
                <button key={f.l} onClick={() => { patchMeta(activeConv.id, { followAt: Date.now() + f.ms }); showToast(`🔔 Recordatorio en ${f.l}`); }}
                  className="pressable flex-1 text-[12px] py-2 rounded-xl glass-soft text-zinc-100 font-medium">⏰ {f.l}</button>
              ))}
            </div>
            {am.followAt && (
              <div className="mt-2 text-[12px] text-amber-200 flex items-center justify-between">
                <span>{am.followAt <= now ? "🔔 ¡Toca dar seguimiento!" : `⏳ ${new Date(am.followAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}</span>
                <button onClick={() => patchMeta(activeConv.id, { followAt: null })} className="text-zinc-400 hover:text-white">✕</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-[120px]">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 mb-2 font-semibold">📝 Notas internas</div>
            <textarea
              value={am.note || ""}
              onChange={(e) => patchMeta(activeConv.id, { note: e.target.value })}
              placeholder="Especialidad, presupuesto, WhatsApp, objeciones…"
              className="flex-1 min-h-[110px] glass-soft rounded-2xl p-3 text-[13px] text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-cyan-300/60 transition-colors duration-200"
            />
          </div>
        </aside>
      )}

      {toast && (
        <div key={toast.id} className="toast glass fixed bottom-8 left-1/2 z-50 px-5 py-3 rounded-2xl text-[13px] font-medium text-white">{toast.text}</div>
      )}
    </div>
  );
}