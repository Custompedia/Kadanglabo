import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'

/*
 * Notifications: a white card in the bottom-right corner with a small coloured icon, gone by itself after a few
 * seconds (errors stay a little longer, and nothing leaves while the pointer rests on it). Several stack upwards,
 * each fully visible. Same call as before: toasts.add({ title, description, variant }).
 */

type Variant = 'default' | 'success' | 'error' | 'warning' | 'info'
type Toast = { id: number; title: string; description?: string; variant: Variant }
type Api = { add: (t: { title: string; description?: string; variant?: Variant }) => void }

const Ctx = createContext<Api>({ add: () => {} })
/** Drop-in for Kumo's useKumoToastManager. */
export const useToasts = () => useContext(Ctx)

const LIFE: Record<Variant, number> = { default: 3500, success: 3500, info: 3500, warning: 5000, error: 6000 }
const MAX = 4
let seq = 0

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const add = useCallback<Api['add']>(({ title, description, variant = 'default' }) => {
    setToasts((t) => [...t, { id: ++seq, title, description, variant }].slice(-MAX))
  }, [])
  const api = useMemo(() => ({ add }), [add])

  return (
    <Ctx.Provider value={api}>
      {children}
      <ol className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <Item key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </ol>
    </Ctx.Provider>
  )
}

function Item({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // the latest onClose, so a new toast arriving (a new callback) never restarts this one's countdown
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const close = useCallback(() => {
    setShown(false)
    setTimeout(() => closeRef.current(), 200)
  }, [])
  const start = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(close, LIFE[toast.variant])
  }, [close, toast.variant])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    start()
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer.current)
    }
  }, [start])

  const icon = {
    success: <CheckCircle size={20} weight="fill" className="text-kumo-success" />,
    error: <WarningCircle size={20} weight="fill" className="text-kumo-danger" />,
    warning: <WarningCircle size={20} weight="fill" className="text-kumo-warning" />,
    info: <Info size={20} weight="fill" className="text-kumo-subtle" />,
    default: <CheckCircle size={20} weight="fill" className="text-kumo-subtle" />,
  }[toast.variant]

  return (
    <li
      role={toast.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={start}
      className={`pointer-events-auto flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.07] transition duration-200 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-5 text-kumo-strong">{toast.title}</span>
        {toast.description && <span className="mt-0.5 block text-[13px] leading-snug text-kumo-subtle">{toast.description}</span>}
      </span>
      <button type="button" onClick={close} aria-label="Tutup" className="-mr-1 grid size-7 shrink-0 place-items-center rounded-md text-kumo-inactive transition hover:bg-kumo-tint hover:text-kumo-default">
        <X size={13} weight="bold" />
      </button>
    </li>
  )
}
