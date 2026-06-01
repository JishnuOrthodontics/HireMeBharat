import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ---- Types ----
export type WsMessageType = 'notification' | 'concierge_message' | 'chat_message' | 'chat_history';

export interface WsNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface WsConciergeMessage {
  id: string;
  from: 'user' | 'concierge';
  content: string;
  timestamp: string;
}

export interface WsChatMessage {
  id: string;
  senderUid: string;
  recipientUid: string;
  content: string;
  timestamp: string;
}

export type WsSubscriber = (data: any) => void;

interface WebSocketContextValue {
  /** True while a WebSocket connection is established */
  connected: boolean;
  /** Send an arbitrary JSON payload over the socket */
  send: (payload: Record<string, unknown>) => void;
  /** Subscribe to a specific message type. Returns an unsubscribe function. */
  subscribe: (type: WsMessageType, callback: WsSubscriber) => () => void;
  /** Send a concierge message */
  sendConciergeMessage: (content: string) => void;
  /** Send a direct chat message */
  sendChatMessage: (recipientUid: string, content: string) => void;
  /** Request chat history with a partner */
  requestChatHistory: (partnerUid: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ---- Provider ----
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, getIdToken } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const subscribersRef = useRef<Map<WsMessageType, Set<WsSubscriber>>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const mountedRef = useRef(true);

  // Build WebSocket URL from the API URL
  const getWsUrl = useCallback(async (): Promise<string | null> => {
    const token = await getIdToken();
    if (!token) return null;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const wsBase = apiUrl.replace(/^http/, 'ws');
    return `${wsBase}/api/ws?token=${encodeURIComponent(token)}`;
  }, [getIdToken]);

  // Dispatch incoming messages to subscribers
  const dispatch = useCallback((type: WsMessageType, data: any) => {
    subscribersRef.current.get(type)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[WS] subscriber error:', e); }
    });
  }, []);

  // Connect / reconnect logic
  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = await getWsUrl();
    if (!url) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setConnected(true);
        reconnectAttempt.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            dispatch(data.type as WsMessageType, data);
          }
        } catch {
          // Ignore unparseable messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect with exponential backoff (max 30s)
        if (mountedRef.current && firebaseUser) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
          reconnectAttempt.current += 1;
          reconnectTimer.current = setTimeout(() => connect(), delay);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, handling reconnection
      };
    } catch {
      // Connection attempt failed, retry via onclose path
    }
  }, [getWsUrl, dispatch, firebaseUser]);

  // Connect when user logs in, disconnect when they log out
  useEffect(() => {
    mountedRef.current = true;

    if (firebaseUser) {
      connect();
    } else {
      // Cleanup on logout
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    }

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [firebaseUser, connect]);

  // ---- Public API ----
  const send = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const subscribe = useCallback((type: WsMessageType, callback: WsSubscriber): (() => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    subscribersRef.current.get(type)!.add(callback);
    return () => {
      subscribersRef.current.get(type)?.delete(callback);
    };
  }, []);

  const sendConciergeMessage = useCallback((content: string) => {
    send({ type: 'concierge_message', content });
  }, [send]);

  const sendChatMessage = useCallback((recipientUid: string, content: string) => {
    send({ type: 'chat_message', recipientUid, content });
  }, [send]);

  const requestChatHistory = useCallback((partnerUid: string) => {
    send({ type: 'chat_history', partnerUid });
  }, [send]);

  return (
    <WebSocketContext.Provider value={{ connected, send, subscribe, sendConciergeMessage, sendChatMessage, requestChatHistory }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ---- Hook ----
export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within <WebSocketProvider>');
  return ctx;
}
