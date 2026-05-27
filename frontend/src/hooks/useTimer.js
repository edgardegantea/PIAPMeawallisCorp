/**
 * useTimer — timer de tiempo real por tarea.
 *
 * El estado activo se persiste en localStorage con la clave TIMER_KEY,
 * así sobrevive navegación entre páginas mientras la pestaña está abierta.
 *
 * API:
 *   isRunning  : boolean — si el timer está activo PARA esta taskId
 *   elapsed    : number  — segundos transcurridos (actualizado cada segundo)
 *   description: string  — descripción capturada al iniciar
 *   start(desc): void    — inicia el timer
 *   stop()     : number  — detiene el timer, retorna horas (float, 2 dec)
 *   activeTask : number|null — id de la tarea con timer activo (cualquiera)
 *   formatElapsed(secs): string — "01:23:45"
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const TIMER_KEY = 'active_timer';

function readTimer() {
  try { return JSON.parse(localStorage.getItem(TIMER_KEY)) || null; }
  catch { return null; }
}

function writeTimer(data) {
  if (data) localStorage.setItem(TIMER_KEY, JSON.stringify(data));
  else localStorage.removeItem(TIMER_KEY);
}

export function formatElapsed(secs) {
  if (!secs && secs !== 0) return '00:00:00';
  const h  = Math.floor(secs / 3600);
  const m  = Math.floor((secs % 3600) / 60);
  const s  = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function useTimer(taskId) {
  const [elapsed, setElapsed]       = useState(0);
  const [isRunning, setIsRunning]   = useState(false);
  const [description, setDescription] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const intervalRef = useRef(null);

  // Sync from localStorage on mount and when taskId changes
  const syncFromStorage = useCallback(() => {
    const t = readTimer();
    if (t) {
      const secs = Math.floor((Date.now() - t.startedAt) / 1000);
      setActiveTask(t.taskId);
      if (t.taskId === taskId) {
        setIsRunning(true);
        setElapsed(Math.max(0, secs));
        setDescription(t.description || '');
      } else {
        setIsRunning(false);
        setElapsed(0);
      }
    } else {
      setIsRunning(false);
      setElapsed(0);
      setActiveTask(null);
      setDescription('');
    }
  }, [taskId]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  // Tick interval — only when this task is running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const t = readTimer();
        if (t && t.taskId === taskId) {
          setElapsed(Math.floor((Date.now() - t.startedAt) / 1000));
        } else {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setElapsed(0);
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, taskId]);

  // Listen for changes from other tabs / components
  useEffect(() => {
    const handler = () => syncFromStorage();
    window.addEventListener('storage', handler);
    // Also poll every 2s in case the same tab updates localStorage without triggering storage event
    const poll = setInterval(handler, 2000);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(poll);
    };
  }, [syncFromStorage]);

  const start = useCallback((desc = '') => {
    writeTimer({ taskId, startedAt: Date.now(), description: desc });
    setIsRunning(true);
    setElapsed(0);
    setDescription(desc);
    setActiveTask(taskId);
  }, [taskId]);

  const stop = useCallback(() => {
    const t = readTimer();
    if (!t || t.taskId !== taskId) return 0;
    const hours = parseFloat(((Date.now() - t.startedAt) / 3600000).toFixed(2));
    writeTimer(null);
    setIsRunning(false);
    setElapsed(0);
    setActiveTask(null);
    return Math.max(0.01, hours); // mínimo 0.01h
  }, [taskId]);

  const cancel = useCallback(() => {
    writeTimer(null);
    setIsRunning(false);
    setElapsed(0);
    setActiveTask(null);
  }, []);

  return { isRunning, elapsed, description, activeTask, start, stop, cancel };
}

/** Hook ligero para saber si HAY un timer activo (sin taskId específico) */
export function useActiveTimer() {
  const [active, setActive] = useState(readTimer);

  useEffect(() => {
    const update = () => setActive(readTimer());
    const poll = setInterval(update, 1000);
    window.addEventListener('storage', update);
    return () => { clearInterval(poll); window.removeEventListener('storage', update); };
  }, []);

  return active; // null | { taskId, startedAt, description }
}
