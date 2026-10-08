import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, MoreVertical, RefreshCw, CheckCheck, Clock, Wifi, WifiOff 
} from 'lucide-react';

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

  const socketRef = useRef(null);

  // Obtener las credenciales limpias
  const rawToken = import.meta.env.VITE_META_TOKEN || process.env.REACT_APP_META_TOKEN || "";
  const rawPageId = import.meta.env.VITE_META_PAGE_ID || process.env.REACT_APP_META_PAGE_ID || "me";
  const token = rawToken.replace(/['"]/g, '').trim();
  const pageId = rawPageId.replace(/['"]/g, '').trim();

  // 1. Cargar historial de conversaciones desde Instagram
  const fetchMetaConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        throw new Error("No se encontró el TOKEN en el archivo .env");
      }

      const targetId = pageId || "me";
      const instagramUrl = `https://graph.instagram.com/v19.0/${targetId}/conversations?fields=participants{id,username,name},messages{message,created_time,from{id,username}},updated_time,unread_count&access_token=${token}`;

      const response = await fetch(instagramUrl);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Error al conectar con Instagram API");
      }

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
          time: conv.updated_time ? new Date(conv.updated_time).toLocaleDateString() : "Hoy",
          unread: (conv.unread_count || 0) > 0,
          messages: messages
        };
      });

      setConversations(formattedConvs);
      if (formattedConvs.length > 0 && !selectedId) {
        setSelectedId(formattedConvs[0].id);
      }
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

          // Al recibir notificación de nuevo mensaje, refrescar conversaciones automáticamente
          if (payload.event === "new_message") {
            fetchMetaConversations();
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
        setTimeout(connectWebSocket, 3000);
      };

      socketRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const activeConv = conversations.find(c => c.id === selectedId) || conversations[0];

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
        return {
          ...c,
          lastMsg: messageText,
          time: "Ahora",
          messages: [...c.messages, tempMsg]
        };
      }
      return c;
    }));

    try {
      // Endpoint de envío de Instagram Graph API
      const recipientId = activeConv.leadId || activeConv.id;
      const sendUrl = `https://graph.instagram.com/v19.0/${pageId}/messages?access_token=${token}`;

      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText }
        })
      });

      const resData = await res.json();

      if (resData.error) {
        throw new Error(resData.error.message);
      }

      console.log("✅ Mensaje enviado exitosamente:", resData);
    } catch (err) {
      console.error("❌ Error enviando mensaje a Meta:", err);
      alert(`No se pudo enviar el mensaje: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConvs = conversations.filter(c => {
    if (filter === "sin_responder") return c.unread;
    return true;
  }).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen w-screen bg-[#030305] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200 relative">
      
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="fixed -bottom-40 right-1/3 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[180px] pointer-events-none" />

      {/* SIDEBAR IZQUIERDO */}
      <aside className="w-80 border-r border-white/[0.08] bg-black/40 backdrop-blur-2xl flex flex-col z-20 shadow-[4px_0_30px_rgba(0,0,0,0.5)]">
        
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xs text-black shadow-lg shadow-cyan-500/20">
                Ω
              </div>
              <span className="font-bold text-xs tracking-wider uppercase text-zinc-200">Synco Inbox</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Estado WebSocket */}
              <div title={wsConnected ? "WebSocket Python Conectado" : "Desconectado de Python (server.py)"} className="flex items-center">
                {wsConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
              </div>

              <button 
                onClick={fetchMetaConversations} 
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Recargar chats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar conversaciones..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-200 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition duration-300" 
            />
          </div>

          <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            {[
              { id: "todos", label: "Todos" },
              { id: "sin_responder", label: "Sin leer" }
            ].map((f) => (
              <button 
                key={f.id} 
                onClick={() => setFilter(f.id)} 
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition duration-300 whitespace-nowrap ${
                  filter === f.id 
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-sm shadow-cyan-500/20" 
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-transparent">
          {loading && (
            <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Cargando chats...
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl m-2">
              {error}
            </div>
          )}

          {!loading && filteredConvs.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <div 
                key={c.id} 
                onClick={() => setSelectedId(c.id)} 
                className={`group relative p-3 rounded-2xl cursor-pointer transition-all duration-300 border ${
                  isSelected 
                    ? "bg-white/[0.06] border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)] shadow-cyan-500/5" 
                    : "bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/10"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.avatarBg} flex items-center justify-center font-bold text-xs text-white shadow-md flex-shrink-0 relative`}>
                    {c.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-cyan-300 transition">
                        {c.name}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono ml-2 flex-shrink-0">{c.time}</span>
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate line-clamp-1 font-light">
                      {c.lastMsg}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ÁREA CENTRAL */}
      <section className="flex-1 flex flex-col bg-black/20 backdrop-blur-3xl relative z-10">
        
        <header className="px-6 py-3.5 border-b border-white/[0.08] bg-black/40 backdrop-blur-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {activeConv && (
              <>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeConv.avatarBg} flex items-center justify-center font-bold text-xs text-white shadow-md`}>
                  {activeConv.avatar}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-zinc-100">{activeConv.name}</h3>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                      {activeConv.ig_user}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {wsConnected ? "Tiempo Real Activo (WebSocket Python)" : "Sin Conexión en Vivo"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={fetchMetaConversations} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] transition">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] transition">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Historial de Mensajes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeConv?.messages?.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
              >
                <div 
                  className={`max-w-[70%] p-4 rounded-2xl text-xs leading-relaxed transition duration-300 relative group ${
                    isMe 
                      ? "bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-[0_8px_25px_rgba(6,182,212,0.25)] border border-cyan-400/30 rounded-br-none" 
                      : "bg-white/[0.04] border border-white/10 text-zinc-200 backdrop-blur-xl shadow-lg rounded-bl-none hover:bg-white/[0.06]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                <div className="flex items-center space-x-1 px-1">
                  <span className="text-[9px] text-zinc-500 font-mono">{msg.time}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Caja de Envío */}
        <div className="p-4 border-t border-white/[0.08] bg-black/50 backdrop-blur-2xl space-y-3">
          <div className="flex items-center space-x-2 bg-white/[0.03] border border-white/10 rounded-2xl p-2 backdrop-blur-xl focus-within:border-cyan-500/50 transition duration-300">
            <input 
              type="text" 
              placeholder="Escribe un mensaje..." 
              value={inputMsg} 
              disabled={isSending}
              onChange={(e) => setInputMsg(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} 
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none px-2 disabled:opacity-50" 
            />

            <button 
              onClick={handleSend} 
              disabled={isSending || !inputMsg.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-semibold text-xs px-4 py-2 rounded-xl transition duration-300 shadow-lg shadow-cyan-500/20 flex items-center space-x-1"
            >
              <span>{isSending ? "Enviando..." : "Enviar"}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}