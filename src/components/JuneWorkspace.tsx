import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Send, Mic, MicOff, Plus, MessageSquare,
  CheckCircle2, AlertCircle, RefreshCw, Volume2, Trash2
} from 'lucide-react';

interface JuneMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ tool: string; result: any }>;
}

interface ConversationItem {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

interface JuneWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadModified?: () => void;
}

export default function JuneWorkspace({ isOpen, onClose, onLeadModified }: JuneWorkspaceProps) {
  const [conversationId, setConversationId] = useState<string>(() => `conv_${Date.now()}`);
  const [messages, setMessages] = useState<JuneMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Namaste! I'm June, your JFS Operations & Sales AI. I have live access to your lead database and JFS business rules.\n\nYou can ask me to search leads, update a stage (e.g. 'Move Rajesh to Site Visit'), check overdue follow-ups, or add notes."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          sendMessage(transcript);
        }
        setIsRecording(false);
      };

      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load conversations list
  async function loadConversations() {
    try {
      const res = await fetch('/api/june/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  function startNewChat() {
    const newId = `conv_${Date.now()}`;
    setConversationId(newId);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Started a fresh conversation. How can I help with your JFS furniture inquiries today?"
      }
    ]);
    setShowHistory(false);
  }

  function speakText(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  function toggleVoice() {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch {
        setIsRecording(false);
      }
    }
  }

  async function sendMessage(textToSend?: string) {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: JuneMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/june/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversation_id: conversationId,
          user: 'Owner'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error reaching June' }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: JuneMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Reviewed workspace.',
        actions: data.actionsExecuted
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If an update action was executed, notify parent to refresh leads
      if (data.actionsExecuted && data.actionsExecuted.length > 0) {
        onLeadModified?.();
      }

      // If in voice mode or requested, speak reply
      if (isRecording) {
        speakText(data.reply);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠ ${err.message || 'Could not connect to June.'} Check if GROQ_API_KEY is configured in your server settings.`
        }
      ]);
    } finally {
      setIsLoading(false);
      loadConversations();
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="june-dock-overlay" onClick={onClose} />
      <div className="june-dock">
        {/* Header */}
        <div className="june-head">
          <div className="june-title-group">
            <div className="june-avatar">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="june-title">June — JFS AI Workspace</div>
              <div className="june-sub">Live Operational Sales Agent · Groq</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={startNewChat}
              title="Start a new chat session"
            >
              <Plus size={14} /> New
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowHistory(!showHistory)}
              title="View past sessions"
            >
              <MessageSquare size={14} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conversation Sessions Drawer */}
        {showHistory && (
          <div style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--border)', padding: '10px 14px', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
              Recent Conversations
            </div>
            {conversations.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>No previous chats yet.</div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setConversationId(c.id);
                    setShowHistory(false);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: c.id === conversationId ? 'rgba(79, 184, 168, 0.15)' : 'transparent',
                    color: c.id === conversationId ? 'var(--accent-2)' : 'var(--text)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {c.title}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Message Feed */}
        <div className="june-body">
          {messages.map((m) => (
            <div key={m.id} className={`june-msg-bubble ${m.role === 'user' ? 'june-msg-user' : 'june-msg-assistant'}`}>
              <div>{m.content}</div>

              {/* Action Pills */}
              {m.actions && m.actions.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {m.actions.map((act, i) => (
                    <div key={i} className="june-action-pill">
                      <CheckCircle2 size={11} />
                      <span>{act.tool.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="june-msg-bubble june-msg-assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} className="spin" style={{ color: 'var(--accent-2)' }} />
              <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>June is inspecting database and reasoning…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          className="june-foot"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <button
            type="button"
            className={`june-voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleVoice}
            title={isRecording ? 'Listening… click to stop' : 'Click to speak voice instruction'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            className="june-input"
            placeholder={isRecording ? 'Listening… speak now' : 'Ask June e.g. "Move Rajesh to Site Visit"…'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }}
            disabled={!inputText.trim() || isLoading}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </>
  );
}
