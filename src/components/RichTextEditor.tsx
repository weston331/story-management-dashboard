/**
 * RichTextEditor — Mobile-first, selection-stable rich text editor.
 *
 * KEY DESIGN DECISIONS:
 *  1. Toolbar is ALWAYS in the DOM (never mounted/unmounted), only toggled via CSS.
 *     This prevents iOS Safari from losing selection when the DOM changes.
 *  2. Native (non-React) touchstart listener on the toolbar element calls
 *     preventDefault() + stopPropagation() to block focus transfer and close-listeners.
 *  3. Document close-listener checks target containment — no stopPropagation needed
 *     from React synthetic events, avoiding React/native event order race conditions.
 *  4. Buttons handle action on onTouchEnd (not onTouchStart) so the touch can still
 *     be cancelled if the user drags their finger off — standard mobile UX.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic } from 'lucide-react';

interface RichTextEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  lang?: 'ar' | 'en';
}

const COLORS = [
  { label: 'أبيض',      value: '#ffffff' },
  { label: 'ذهبي',      value: '#D4AF37' },
  { label: 'سماوي',     value: '#7dd3fc' },
  { label: 'أخضر',      value: '#34d399' },
  { label: 'وردي',      value: '#f9a8d4' },
  { label: 'رمادي',     value: '#a8a29e' },
];

const FONTS = [
  { label: 'افتراضي',       value: 'inherit' },
  { label: 'Cairo',         value: 'Cairo, sans-serif' },
  { label: 'Tajawal',       value: 'Tajawal, sans-serif' },
  { label: 'Almarai',       value: 'Almarai, sans-serif' },
  { label: 'Amiri',         value: 'Amiri, serif' },
  { label: 'Aref Ruqaa',    value: '"Aref Ruqaa", serif' },
  { label: 'Reem Kufi',     value: '"Reem Kufi", serif' },
  { label: 'Scheherazade',  value: '"Scheherazade New", serif' },
  { label: 'Lalezar',       value: 'Lalezar, serif' },
];

const SIZES = ['13', '15', '17', '20', '24', '28'];

export default function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  placeholder = '',
  className = '',
  lang = 'ar',
}: RichTextEditorProps) {
  const editorRef  = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const savedRangeRef  = useRef<Range | null>(null);
  const lastTouchActionRef = useRef(0);

  const [activated,   setActivated]   = useState(false);
  const [openPanel,   setOpenPanel]   = useState<'font' | 'size' | null>(null);
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [activeFont,  setActiveFont]  = useState('inherit');
  const [activeSize,  setActiveSize]  = useState('16');

  /* ── Sync prop → DOM without cursor jump ── */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming  = value ?? '';
    const domHTML   = el.innerHTML === '<br>' ? '' : el.innerHTML;
    if (domHTML !== incoming) el.innerHTML = incoming;
  }, [value]);

  /* ── Native touchstart on toolbar: prevent focus loss + snapshot selection ──
     Must be native (not React synthetic) so preventDefault fires BEFORE the
     browser decides to move focus or collapse the selection.
     We ALSO snapshot the current selection here — this is the earliest point
     before any DOM changes (React re-renders, dropdowns opening) can wipe it. */
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const handler = (e: TouchEvent) => {
      // Snapshot selection FIRST — before anything can change it
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
      e.preventDefault();   // keeps focus in contentEditable
      e.stopPropagation();  // blocks document close-listener
    };
    toolbar.addEventListener('touchstart', handler, { passive: false });
    return () => toolbar.removeEventListener('touchstart', handler);
  }, []); // mount once — toolbar never leaves DOM

  /* ── Document close-listener ── */
  useEffect(() => {
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target  = e.target as Node;
      const inEditor  = editorRef.current?.contains(target) ?? false;
      const inToolbar = toolbarRef.current?.contains(target) ?? false;
      if (!inEditor && !inToolbar) {
        setActivated(false);
        setOpenPanel(null);
        onBlur?.();
      }
    };
    // bubble phase so toolbar's native stopPropagation fires first
    document.addEventListener('touchstart', onOutside);
    document.addEventListener('mousedown',  onOutside);
    return () => {
      document.removeEventListener('touchstart', onOutside);
      document.removeEventListener('mousedown',  onOutside);
    };
  }, [onBlur]);

  /* ── Selection helpers ── */
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Only update savedRangeRef when the selection is actually inside the editor.
    // On mobile, selectionchange fires when tapping the toolbar which moves the
    // selection outside — we must NOT overwrite the saved range at that point.
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
    // If selection moved outside (e.g. toolbar tap), keep the last saved range intact.
  }, []);

  const restoreSelection = useCallback(() => {
    const saved = savedRangeRef.current;
    if (!saved) {
      editorRef.current?.focus({ preventScroll: true });
      return;
    }
    // Restore the range first, THEN focus — this order is critical on mobile.
    // Calling focus() first can reset the selection to caret-at-end.
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(saved);
    }
    // Focus without preventScroll to ensure editor is active but don't move viewport
    editorRef.current?.focus({ preventScroll: true });
    // Re-apply the range after focus in case the browser reset it
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(saved);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', saveSelection);
    return () => document.removeEventListener('selectionchange', saveSelection);
  }, [saveSelection]);

  /* ── Save selection before opening a panel (dropdown) ──
     Opening font/size panels triggers a React re-render which can
     discard the DOM selection on mobile. Snapshot it here first.  */
  const openPanelWithSavedSelection = useCallback((panel: 'font' | 'size' | null) => {
    // Capture selection right now before the re-render
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
    setOpenPanel(panel);
  }, []);
  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    onChange(html === '<br>' || html === '' ? '' : html);
  }, [onChange]);

  /* ── Format commands ── */
  const execFormat = useCallback((cmd: string) => {
    restoreSelection();
    document.execCommand(cmd, false, undefined);
    saveSelection();
    handleInput();
  }, [restoreSelection, saveSelection, handleInput]);

  const applyStyleToRange = useCallback((range: Range, prop: 'color' | 'font-family' | 'font-size', val: string) => {
    const span = document.createElement('span');
    if (prop === 'color') span.style.color = val;
    if (prop === 'font-family') span.style.fontFamily = val;
    if (prop === 'font-size') span.style.fontSize = val + 'px';

    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(nextRange);
      savedRangeRef.current = nextRange.cloneRange();
    }
  }, []);

  const applyStyle = useCallback((prop: 'color' | 'font-family' | 'font-size', val: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      // No selection: update state only (next typed chars inherit style)
      if (prop === 'color')       setActiveColor(val);
      if (prop === 'font-family') setActiveFont(val);
      if (prop === 'font-size')   setActiveSize(val);
      return;
    }

    if (prop === 'color')       setActiveColor(val);
    if (prop === 'font-family') setActiveFont(val);
    if (prop === 'font-size')   setActiveSize(val);

    try {
      applyStyleToRange(range, prop, val);
    } catch {
      if (prop === 'color') document.execCommand('foreColor', false, val);
      if (prop === 'font-family') document.execCommand('fontName', false, val);
      if (prop === 'font-size') applyStyleToRange(range, prop, val);
    }

    const newSel = window.getSelection();
    if (newSel?.rangeCount) savedRangeRef.current = newSel.getRangeAt(0).cloneRange();
    handleInput();
  }, [restoreSelection, applyStyleToRange, handleInput]);

  /* ── Toolbar button interaction ──
     onMouseDown: e.preventDefault() prevents focus loss on desktop.
     onTouchEnd:  fires the action on mobile (after native preventDefault
                  on toolbar blocked the focus-loss at touchstart level).  */
  const btnProps = (action: () => void) => ({
    type: 'button' as const,
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onTouchEnd:  (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      lastTouchActionRef.current = Date.now();
      action();
    },
    onClick:     () => {
      if (Date.now() - lastTouchActionRef.current < 700) return;
      action();
    },   // desktop fallback
  });

  const fontLabel = FONTS.find(f => f.value === activeFont)?.label ?? 'الخط';

  /* ─────────────────────────────────────────
     RENDER — toolbar is ALWAYS in the DOM!
  ───────────────────────────────────────── */
  return (
    <div className="relative w-full flex flex-col">

      {/* ════ TOOLBAR — CSS-only show/hide ════ */}
      <div
        ref={toolbarRef}
        aria-hidden={!activated}
        style={{
          opacity:        activated ? 1 : 0,
          visibility:     activated ? 'visible' : 'hidden',
          pointerEvents:  activated ? 'auto'    : 'none',
          maxHeight:      activated ? '200px'   : '0px',
          marginBottom:   activated ? '6px'     : '0px',
          transition:     'opacity 0.15s ease, max-height 0.15s ease',
          overflow:       'visible',
        }}
        className="flex flex-wrap items-center gap-1.5 p-2 bg-[#14151f] border border-[#D4AF37]/30 rounded-xl shadow-lg select-none w-full"
        dir="ltr"
      >
        {/* Bold / Italic */}
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
          <button {...btnProps(() => execFormat('bold'))}
            className="p-1.5 text-stone-400 hover:text-[#D4AF37] active:text-[#D4AF37] rounded transition-colors">
            <Bold className="w-4 h-4" />
          </button>
          <button {...btnProps(() => execFormat('italic'))}
            className="p-1.5 text-stone-400 hover:text-[#D4AF37] active:text-[#D4AF37] rounded transition-colors">
            <Italic className="w-4 h-4" />
          </button>
        </div>

        {/* Font dropdown */}
        <div className="relative shrink-0">
          <button
            {...btnProps(() => openPanelWithSavedSelection(openPanel === 'font' ? null : 'font'))}
            className="flex items-center gap-1 bg-[#1e1f29] border border-white/10 text-stone-300 text-[11px] rounded-lg px-2.5 py-1.5 hover:border-[#D4AF37]/50 transition-colors min-h-[30px]"
          >
            <span style={{ fontFamily: activeFont }}>{fontLabel}</span>
            <span className="text-[8px] opacity-50 ml-0.5">▼</span>
          </button>

          {openPanel === 'font' && (
            <div
              className="absolute top-full right-0 mt-1 z-50 bg-[#11121a] border border-stone-700 rounded-xl shadow-2xl p-1 min-w-[170px] max-h-[250px] overflow-y-auto"
              dir="rtl"
            >
              {FONTS.map(f => (
                <button
                  key={f.value}
                  {...btnProps(() => { applyStyle('font-family', f.value); setOpenPanel(null); })}
                  className={`w-full text-right px-3 py-2.5 text-sm rounded-lg transition-colors touch-manipulation ${
                    activeFont === f.value
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'text-stone-300 hover:bg-white/8 active:bg-white/15'
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Size dropdown */}
        <div className="relative shrink-0">
          <button
            {...btnProps(() => openPanelWithSavedSelection(openPanel === 'size' ? null : 'size'))}
            className="flex items-center gap-1 bg-[#1e1f29] border border-white/10 text-stone-300 text-[11px] rounded-lg px-2.5 py-1.5 hover:border-[#D4AF37]/50 transition-colors min-h-[30px]"
          >
            <span>{activeSize}px</span>
            <span className="text-[8px] opacity-50 ml-0.5">▼</span>
          </button>

          {openPanel === 'size' && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-[#11121a] border border-stone-700 rounded-xl shadow-2xl p-1 min-w-[105px]">
              {SIZES.map(s => (
                <button
                  key={s}
                  {...btnProps(() => { applyStyle('font-size', s); setOpenPanel(null); })}
                  className={`w-full text-center px-3 py-2.5 text-sm rounded-lg transition-colors touch-manipulation ${
                    activeSize === s
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'text-stone-300 hover:bg-white/8 active:bg-white/15'
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 shrink-0">
          {COLORS.map(c => (
            <button
              key={c.value}
              {...btnProps(() => applyStyle('color', c.value))}
              title={c.label}
              className={`w-4 h-4 rounded-full border transition-transform active:scale-90 touch-manipulation ${
                activeColor === c.value
                  ? 'ring-2 ring-offset-1 ring-offset-[#14151f] ring-[#D4AF37] scale-110'
                  : 'border-white/20'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}

          {/* Color mixer */}
          <div
            className="w-4 h-4 rounded-full border border-white/25 cursor-pointer shrink-0 relative"
            style={{ background: 'conic-gradient(red,orange,yellow,green,blue,violet,red)' }}
            onMouseDown={(e) => e.preventDefault()}
            onTouchEnd={() => colorPickerRef.current?.click()}
            onClick={() => colorPickerRef.current?.click()}
          >
            <input
              ref={colorPickerRef}
              type="color"
              defaultValue="#ffffff"
              onChange={e => applyStyle('color', e.target.value)}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
        </div>
      </div>

      {/* ════ EDITOR ════ */}
      <div className="relative w-full">
        <div
          id={id}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setActivated(true)}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onTouchEnd={saveSelection}
          className={[
            'w-full min-h-[90px] bg-white/5 border border-white/10 rounded-lg',
            'p-3.5 text-sm focus:outline-none focus:border-[#D4AF37]/60',
            'focus:ring-1 focus:ring-[#D4AF37]/20 transition-all leading-relaxed',
            'overflow-y-auto outline-none',
            className,
          ].join(' ')}
          style={{
            direction: lang === 'ar' ? 'rtl' : 'ltr',
            color: '#e7e5e4',
            WebkitUserSelect: 'text',
            userSelect: 'text',
          }}
        />
        {(!value || value === '<br>' || value === '') && (
          <div
            className="absolute top-3.5 pointer-events-none select-none text-stone-600 text-xs"
            style={{ [lang === 'ar' ? 'right' : 'left']: '14px' }}
          >
            {placeholder}
          </div>
        )}
      </div>

    </div>
  );
}
