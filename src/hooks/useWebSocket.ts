import { useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WSEvent =
  | { type: 'machine_status_changed'; machineId: string; machineName: string; department: string; status: string; timestamp: string }
  | { type: 'fault_created';   fault: any }
  | { type: 'fault_accepted';  faultId: string; technicianName: string }
  | { type: 'fault_resolved';  faultId: string; machineId: string; resolvedAt: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_URL = 'wss://sublime-caring-production-efd3.up.railway.app/ws/';
const RECONNECT_MS = 3000;
const MAX_RETRIES  = 10;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWebSocket(
  user: any,
  onEvent: (evt: WSEvent) => void,
  department = 'all',
) {
  const wsRef      = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      if (department !== 'all') {
        ws.send(JSON.stringify({ type: 'subscribe', department }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data);
        onEventRef.current(msg);
      } catch (e) {
       /* malformed message — ignore */
      }
    };

    ws.onerror = () => { /* connection error — onclose will handle reconnect */ };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current++;
        timerRef.current = setTimeout(connect, RECONNECT_MS);
      }
    };
  }, [department]);

  useEffect(() => {
    if (!user) return;
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect, user]);
}