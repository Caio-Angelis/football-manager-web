import { useEffect, useRef, useState, useCallback } from 'react';
import { getRoom, type PublicRoom } from '../api/client';

interface UseRoomPollingOptions {
  code: string;
  onRoomUpdate: (room: PublicRoom) => void;
  onRoomClosed?: () => void;
  enabled?: boolean;
}

interface UseRoomPollingResult {
  isReconnecting: boolean;
  error: string | null;
}

const BASE_INTERVAL = 2000;
const MAX_INTERVAL = 8000;

export function useRoomPolling({
  code,
  onRoomUpdate,
  onRoomClosed,
  enabled = true,
}: UseRoomPollingOptions): UseRoomPollingResult {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);
  const failCountRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const onRoomUpdateRef = useRef(onRoomUpdate);
  const onRoomClosedRef = useRef(onRoomClosed);

  useEffect(() => {
    onRoomUpdateRef.current = onRoomUpdate;
    onRoomClosedRef.current = onRoomClosed;
  });

  const scheduleNext = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(poll, delay);
  }, []);

  const poll = useCallback(async () => {
    if (!aliveRef.current) return;

    abortRef.current = new AbortController();
    try {
      const { room } = await getRoom(code);
      if (!aliveRef.current) return;

      failCountRef.current = 0;
      setIsReconnecting(false);
      setError(null);
      onRoomUpdateRef.current(room);
      scheduleNext(BASE_INTERVAL);
    } catch (e) {
      if (!aliveRef.current) return;

      const status = (e as { status?: number })?.status;
      if (status === 404) {
        onRoomClosedRef.current?.();
        return;
      }

      failCountRef.current += 1;
      if (failCountRef.current >= 2) setIsReconnecting(true);
      setError(e instanceof Error ? e.message : 'Sala indisponível.');

      const delay = Math.min(BASE_INTERVAL * Math.pow(2, failCountRef.current - 1), MAX_INTERVAL);
      scheduleNext(delay);
    }
  }, [code, scheduleNext]);

  useEffect(() => {
    if (!enabled) return;
    aliveRef.current = true;
    failCountRef.current = 0;
    poll();

    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [code, enabled, poll]);

  return { isReconnecting, error };
}
