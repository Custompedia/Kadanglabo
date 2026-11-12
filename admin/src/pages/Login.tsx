import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeSlash, Info, LockSimple, Warning, ArrowRight } from '@phosphor-icons/react'
import { api, ApiError } from '../lib/api'
import { useSession, type User } from '../lib/session'

/*
 * Sign-in: one frosted-glass card (iOS style) over a Kadanglabo building, softly dimmed. Everything on it is white at
 * different opacities, so nothing shouts; notices are tinted glass, never a solid colour.
 */

type Notice = { tone: 'error' | 'warning' | 'locked'; text: string } | null

export function Login() {
  const { setUser } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [loaded, setLoaded] = useState(false)
  const userRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    userRef.current?.focus()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setNotice({ tone: 'warning', text: 'Isi username dan password terlebih dahulu.' })
      ;(!username.trim() ? userRef : pwRef).current?.focus()
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const r = await api<{ user: User }>('/auth/login', { body: { username, password } })
      setUser(r.user)
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'locked' || e.code === 'disabled') setNotice({ tone: 'locked', text: e.message })
      else {
        const left = typeof e.data?.remaining === 'number' ? (e.data.remaining as number) : null
        setNotice({
          tone: left !== null && left <= 2 ? 'warning' : 'error',
          text: left !== null && left <= 2 ? `${e.message} ${left} percobaan tersisa sebelum akun terkunci.` : e.message,
        })
        setPassword('')
        pwRef.current?.focus()
      }
    } finally {
      setBusy(false)
    }
  }

  const field =
    'peer h-12 w-full rounded-2xl border border-white/25 bg-white/10 px-4 text-[15px] text-white placeholder:text-white/45 outline-none transition ' +
    'focus:border-white/55 focus:bg-white/16 focus:ring-4 focus:ring-white/10 disabled:opacity-60'

  return (
    <main className="relative grid min-h-full place-items-center overflow-hidden bg-[#1d1f22] px-4 py-10">
      <img
        src="/login-1920.webp"
        srcSet="/login-1280.webp 1280w, /login-1920.webp 1920w"
        sizes="100vw"
        alt=""
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full scale-105 object-cover transition-[opacity,transform] duration-[1400ms] ease-out ${loaded ? 'scale-100 opacity-100' : 'opacity-0'}`}
      />
      {/* a soft vignette so the card always reads, whatever part of the photo is behind it */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(16,18,22,0.15),rgba(16,18,22,0.62))]" />

      <section
        className="relative w-full max-w-[400px] rounded-[30px] border border-white/25 bg-white/12 p-8 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:p-9"
        aria-labelledby="login-title"
      >
        <img src="/brand/kadanglabo-logo-white.svg" alt="Kadanglabo" className="mb-8 h-8 w-auto opacity-95" />
        <h1 id="login-title" className="text-[26px] font-semibold tracking-tight">
          Masuk ke dashboard
        </h1>
        <p className="mt-1.5 text-[15px] text-white/70">Kelola projek dan artikel website Kadanglabo.</p>

        <form className="mt-7 grid gap-4" onSubmit={submit} noValidate>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-white/80">Username</span>
            <input
              ref={userRef}
              className={field}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              disabled={busy}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nama pengguna"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-white/80">Password</span>
            <span className="relative">
              <input
                ref={pwRef}
                className={`${field} pr-12`}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                disabled={busy}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-1.5 my-auto grid size-9 place-items-center rounded-xl text-white/65 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/50"
                aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {show ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {notice && <NoticeBox notice={notice} />}

          <button
            type="submit"
            disabled={busy}
            className="group mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/90 text-[15px] font-semibold text-[#1d1f22] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition hover:bg-white active:scale-[0.99] disabled:cursor-progress disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            {busy ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-[#1d1f22]/25 border-t-[#1d1f22]" />
                Memeriksa…
              </>
            ) : (
              <>
                Masuk
                <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 text-[13px] leading-snug text-white/55">
          <Info size={16} className="mt-px shrink-0" />
          Akun dibuat oleh admin. Lupa password atau akun terkunci? Hubungi admin Kadanglabo.
        </p>
      </section>
    </main>
  )
}

function NoticeBox({ notice }: { notice: NonNullable<Notice> }) {
  const tint = {
    error: 'border-[#ffb4a8]/30 bg-[#ff8a75]/14',
    warning: 'border-[#ffd59a]/30 bg-[#ffc46b]/14',
    locked: 'border-white/25 bg-white/14',
  }[notice.tone]
  const Icon = notice.tone === 'locked' ? LockSimple : Warning
  return (
    <div role="alert" aria-live="assertive" className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-[14px] leading-snug text-white/92 backdrop-blur-md animate-[fade-in_200ms_ease-out] ${tint}`}>
      <Icon size={18} weight="duotone" className="mt-px shrink-0 text-white/85" />
      <span>{notice.text}</span>
    </div>
  )
}
