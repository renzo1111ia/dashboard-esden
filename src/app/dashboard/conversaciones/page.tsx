"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    MessageSquare, Search, Phone, MoreVertical, 
    Paperclip, Smile, Send, Bot, User, MessageCircle,
    Check, CheckCheck, Loader2, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
    getInboxLeads, getChatHistory, sendManualMessage, injectMockupMessage,
    type InboxLead, type ChatMessage 
} from "@/lib/actions/inbox";

export default function InboxPage() {
    const [leads, setLeads] = useState<InboxLead[]>([]);
    const [selectedLead, setSelectedLead] = useState<InboxLead | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingChat, setLoadingChat] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [sending, setSending] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    const loadLeads = useCallback(async () => {
        setLoading(true);
        const res = await getInboxLeads();
        if (res.success && res.data) {
            setLeads(res.data);
        }
        setLoading(false);
    }, []);

    const loadChat = useCallback(async (leadId: string) => {
        setLoadingChat(true);
        const res = await getChatHistory(leadId);
        if (res.success && res.data) {
            setMessages(res.data);
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
        setLoadingChat(false);
    }, []);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    useEffect(() => {
        if (selectedLead) {
            loadChat(selectedLead.id);
        } else {
            setMessages([]);
        }
    }, [selectedLead, loadChat]);

    async function handleSendMessage() {
        if (!selectedLead || !messageText.trim()) return;
        
        setSending(true);
        const res = await sendManualMessage(selectedLead.id, messageText.trim(), "TEXT");
        if (res.success && res.data) {
            // Optimistic update
            setMessages(prev => [...prev, res.data as ChatMessage]);
            setMessageText("");
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
            
            // Update the lead list last message
            setLeads(prev => prev.map(l => 
                l.id === selectedLead.id 
                    ? { ...l, last_message: res.data!.content, last_message_time: res.data!.created_at }
                    : l
            ));
        }
        setSending(false);
    }

    async function handleSendMockTemplate() {
        if (!selectedLead) return;
        await sendManualMessage(selectedLead.id, "hello_v1", "TEMPLATE");
        await loadChat(selectedLead.id);
    }

    async function handleInjectIncomingMock() {
        if (!selectedLead) return;
        await injectMockupMessage(
            selectedLead.id, "INBOUND", 
            "¡Hola! Sí, estoy muy interesado. Me gustaría agendarnos para mañana."
        );
        await loadChat(selectedLead.id);
    }

    // Format time (e.g. "12:30" or "Ayer")
    const formatTime = (ts?: string) => {
        if (!ts) return "";
        const d = new Date(ts);
        return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="h-[calc(100vh)] flex bg-slate-950 text-white overflow-hidden">
            
            {/* ─── SIDEBAR (Lista de Leads) ───────────────────────── */}
            <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-white/5 bg-slate-950/50">
                {/* Header */}
                <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-white/90">Conversaciones</h1>
                    </div>
                    <button title="Opciones" className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-all">
                        <MoreVertical className="h-4 w-4 text-white/40" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <input 
                            placeholder="Buscar chats o números..." 
                            className="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/20"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10 opacity-50"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : leads.length === 0 ? (
                        <div className="px-6 py-12 text-center text-white/30 text-xs font-bold leading-relaxed">
                            No hay conversaciones activas. Configura el orquestador para iniciar interacciones.
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {leads.map(lead => (
                                <button
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    className={cn(
                                        "w-full px-5 py-4 flex items-center gap-4 transition-all text-left",
                                        selectedLead?.id === lead.id ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-white/[0.02] border-l-2 border-transparent"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 relative">
                                        <User className="h-5 w-5 text-white/40" />
                                        {lead.unread_count ? (
                                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-slate-950 flex items-center justify-center text-[9px] font-black">{lead.unread_count}</div>
                                        ) : null}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-bold truncate">
                                                {lead.nombre || lead.apellido ? `${lead.nombre || ''} ${lead.apellido || ''}` : lead.telefono || "Anónimo"}
                                            </p>
                                            <span className={cn("text-[9px] font-black uppercase flex-shrink-0 ml-2", selectedLead?.id === lead.id ? "text-primary" : "text-white/30")}>
                                                {formatTime(lead.last_message_time)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/40 truncate font-medium">
                                            {lead.last_message || "Sin mensajes recientes"}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── MAIN CHAT AREA ───────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-[#0b141a] relative">
                {/* Chat Header */}
                {selectedLead ? (
                    <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-[#202c33] z-10 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-white/60" />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-white/90 leading-none">
                                    {selectedLead.nombre ? `${selectedLead.nombre} ${selectedLead.apellido || ''}` : selectedLead.telefono}
                                </h2>
                                <p className="text-[11px] text-white/50 mt-1">{selectedLead.telefono}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSendMockTemplate} title="Enviar Plantilla (Mock)" className="h-9 px-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2 hover:bg-white/10 transition-all text-[10px] font-black uppercase text-emerald-400">
                                <Zap className="h-4 w-4" /> Plantilla Rapida
                            </button>
                            <button onClick={handleInjectIncomingMock} title="Simular Respuesta del Lead" className="h-9 px-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2 hover:bg-white/10 transition-all text-[10px] font-black uppercase text-white/40">
                                <MessageCircle className="h-4 w-4" /> Inbox Test
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-2" />
                            <Search className="h-5 w-5 text-white/40 ml-2 cursor-pointer hover:text-white" />
                            <MoreVertical className="h-5 w-5 text-white/40 ml-2 cursor-pointer hover:text-white" />
                        </div>
                    </div>
                ) : (
                    <div className="h-16 border-b border-white/5 bg-[#202c33]" />
                )}

                {/* Messages History */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar bg-no-repeat bg-cover bg-center bg-[url('/chat-bg.png')]">
                    {!selectedLead ? (
                        <div className="h-full flex flex-col items-center justify-center text-white/40">
                            <div className="h-32 w-32 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                <MessageSquare className="h-10 w-10 text-white/20" />
                            </div>
                            <h2 className="text-2xl font-light mb-2">ESDEN Omnicanal</h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Envía y recibe mensajes, asiste a la IA.</p>
                        </div>
                    ) : loadingChat ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10">
                            <span className="bg-[#202c33] text-white/60 text-xs px-4 py-2 rounded-xl border border-white/5 shadow-sm inline-block">
                                Aún no hay mensajes en esta conversación. Envía uno abajo.
                            </span>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            if (msg.message_type === "SYSTEM_LOG") {
                                return (
                                    <div key={msg.id} className="flex w-full justify-center my-2">
                                        <div className="max-w-[90%] md:max-w-[75%] rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white/70 shadow-sm text-sm">
                                            <div className="flex items-center gap-2 mb-2 text-primary/80">
                                                <Phone className="h-4 w-4" />
                                                <span className="text-[11px] font-black uppercase tracking-widest">
                                                    Registro del Sistema
                                                </span>
                                            </div>
                                            <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-mono">
                                                {msg.content}
                                            </div>
                                            <div className="text-[10px] text-white/40 mt-2 text-right">
                                                {formatTime(msg.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            const isOut = msg.direction === "OUTBOUND";
                            const isBot = msg.sent_by?.toLowerCase().includes("agente") || msg.message_type === "TEMPLATE";
                            
                            return (
                                <div key={msg.id} className={cn("flex w-full", isOut ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[85%] md:max-w-[65%] rounded-2xl px-3 py-2 flex flex-col shadow-sm relative group",
                                        isOut ? "bg-[#005c4b] rounded-tr-none text-white" : "bg-[#202c33] rounded-tl-none text-white"
                                    )}>
                                        {/* Meta-tag / SentBy indicator (Solo para OUTBOUND) */}
                                        {isOut && (
                                            <div className="flex items-center gap-1.5 mb-1 opacity-70 border-b border-white/10 pb-1 w-fit">
                                                {isBot ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                <span className="text-[10px] font-black uppercase tracking-wider">
                                                    {msg.sent_by || (isBot ? "Agente Automático" : "Asesor")}
                                                </span>
                                            </div>
                                        )}

                                        {/* Template Indicator */}
                                        {msg.message_type === "TEMPLATE" && (
                                            <div className="flex items-center gap-1.5 mb-2 bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20 w-fit">
                                                <Zap className="h-3 w-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Plantilla: {msg.content}</span>
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="text-[14.2px] leading-relaxed whitespace-pre-wrap font-sans">
                                            {msg.message_type === "TEMPLATE" ? "Contenido interactivo de la plantilla enviada a Meta." : msg.content}
                                        </div>

                                        {/* Footer (Time & Status) */}
                                        <div className="flex items-center justify-end gap-1.5 mt-1 ml-6">
                                            <span className="text-[10px] text-white/50">{formatTime(msg.created_at)}</span>
                                            {isOut && (
                                                <span className="text-white/50">
                                                    {msg.status === "READ" ? <CheckCheck className="h-3 w-3 text-blue-400" /> : 
                                                     msg.status === "DELIVERED" ? <CheckCheck className="h-3 w-3" /> : 
                                                     <Check className="h-3 w-3" />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Chat Input ── (Solo si hay lead seleccionado) */}
                {selectedLead && (
                    <div className="bg-[#202c33] px-4 py-3 flex items-end gap-3 flex-shrink-0 z-10 w-full shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                        <button title="Emojis" className="h-10 w-10 flex items-center justify-center flex-shrink-0 hover:bg-white/5 rounded-full transition-all group">
                            <Smile className="h-6 w-6 text-white/50 group-hover:text-white/80" />
                        </button>
                        <button title="Adjuntar" className="h-10 w-10 flex items-center justify-center flex-shrink-0 hover:bg-white/5 rounded-full transition-all group mr-1">
                            <Paperclip className="h-5 w-5 text-white/50 group-hover:text-white/80 transform rotate-45" />
                        </button>

                        <div className="flex-1 bg-[#2a3942] rounded-xl flex items-center min-h-[44px]">
                            <textarea 
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                                }}
                                placeholder="Escribe un mensaje..."
                                disabled={sending}
                                rows={1}
                                className="w-full bg-transparent border-none focus:ring-0 text-[15px] px-4 py-3 resize-none max-h-32 custom-scrollbar placeholder:text-white/40"
                            />
                        </div>

                        {messageText.trim() ? (
                            <button 
                                title="Enviar mensaje"
                                onClick={handleSendMessage} disabled={sending}
                                className="h-[44px] w-[44px] bg-primary rounded-full flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <Send className="h-5 w-5 text-white -ml-0.5" />
                            </button>
                        ) : (
                            <button title="Llamar" className="h-[44px] w-[44px] flex items-center justify-center flex-shrink-0 hover:bg-white/5 rounded-full transition-all group">
                                <Phone className="h-5 w-5 text-white/50 group-hover:text-white/80" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}
