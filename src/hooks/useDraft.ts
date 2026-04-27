/**
 * useDraft — Auto-save draft content to local SQLite (via sql.js + IndexedDB).
 *
 * Behaviour:
 *   - On mount: loads any existing draft for the given key and populates the editor.
 *   - On change: debounces 2 s then saves to IndexedDB-backed SQLite.
 *   - On submit: caller invokes `clearDraft()` which deletes the row.
 *   - Shows a "Draft saved" indicator for 2 s after each save.
 *
 * SECURITY NOTE:
 *   - Draft content is raw user input; it is sanitized at render time (DOMPurify),
 *     not here. Do not treat draft content as safe HTML.
 *   - No auth tokens or sensitive data are ever passed to this hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraft, loadDraft, deleteDraft } from '../utils/storage';

const AUTOSAVE_DELAY_MS = 2000;

interface UseDraftReturn {
  content: string;
  setContent: (value: string) => void;
  clearDraft: () => Promise<void>;
  draftSaved: boolean; // true for 2 s after each auto-save
  isLoadingDraft: boolean;
}

export function useDraft(draftKey: string): UseDraftReturn {
  const [content, setContentState] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Load existing draft on mount ----
  useEffect(() => {
    let cancelled = false;
    setIsLoadingDraft(true);

    loadDraft(draftKey)
      .then((saved) => {
        if (!cancelled && saved) {
          setContentState(saved);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoadingDraft(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // ---- Auto-save whenever content changes ----
  const setContent = useCallback(
    (value: string) => {
      setContentState(value);

      // Clear pending save timer
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          await saveDraft(draftKey, value);
          setDraftSaved(true);

          // Reset the "Draft saved" indicator after 2 s
          if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
          indicatorTimerRef.current = setTimeout(() => setDraftSaved(false), 2000);
        } catch (err) {
          console.error('[useDraft] Failed to save draft:', err);
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [draftKey],
  );

  // ---- Clear draft after successful submission ----
  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setContentState('');
    setDraftSaved(false);
    await deleteDraft(draftKey);
  }, [draftKey]);

  // ---- Cleanup timers on unmount ----
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    };
  }, []);

  return { content, setContent, clearDraft, draftSaved, isLoadingDraft };
}
