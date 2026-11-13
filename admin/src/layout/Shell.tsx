import { useEffect, useState, type ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { Link, useLocation, useNavigate } from 'react-router'
import { DropdownMenu, Sidebar, useSidebar } from '@cloudflare/kumo'
import { ArrowSquareOut, Buildings, CaretDown, GearSix, House, Pulse, SquaresFour, ImagesSquare, MagnifyingGlass, Newspaper, List, SignOut, User, UserCircle, UsersThree } from '@phosphor-icons/react'
import { useSession } from '../lib/session'
import { SearchPalette } from './SearchPalette'

export const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL ?? 'https://kadanglabo.com'

/*
 * The dashboard frame, after the Cloudflare dashboard: sidebar on the left (brand, quick search, sections; it folds
 * down to icons), a slim top bar with the account menu on the right, and the page.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const { pathname } = useLocation()
  const [search, setSearch] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch((s) => !s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const at = (p: string) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`))

  return (
    <Sidebar.Provider defaultOpen className="admin-shell h-full">
      <CloseNavigationOnRouteChange />
      <Sidebar>
        <Sidebar.Header className="flex-row items-center">
          <Brand />
          <Sidebar.Close aria-label="Tutup navigasi" className="md:hidden" />
        </Sidebar.Header>

        <Sidebar.Content>
          <SearchButton onOpen={() => setSearch(true)} />
          <Sidebar.Group>
            <Sidebar.Menu>
              <NavItem icon={House} to="/" active={at('/')} label="Ringkasan" />
            </Sidebar.Menu>
          </Sidebar.Group>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Konten</Sidebar.GroupLabel>
            <Sidebar.Menu>
              <NavItem icon={Buildings} to="/projects" active={at('/projects')} label="Projek" />
              <NavItem icon={Newspaper} to="/articles" active={at('/articles')} label="Artikel" />
              <NavItem icon={ImagesSquare} to="/media" active={at('/media')} label="Media" />
            </Sidebar.Menu>
          </Sidebar.Group>
          <Sidebar.Group>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.Collapsible defaultOpen={at('/pages') || at('/locations')}>
                  <Sidebar.CollapsibleTrigger
                    render={
                      <Sidebar.MenuButton icon={SquaresFour} tooltip="Halaman website">
                        Halaman website
                        <Sidebar.MenuChevron />
                      </Sidebar.MenuButton>
                    }
                  />
                  <Sidebar.CollapsibleContent>
                    <Sidebar.MenuSub>
                      {(
                        [
                          ['/pages/work', 'Our Work'],
                          ['/pages/commercial', 'Commercial'],
                          ['/pages/hospitality', 'Hospitality'],
                          ['/pages/residential', 'Residential'],
                          ['/locations', 'Lokasi'],
                        ] as const
                      ).map(([to, label]) => (
                        <Sidebar.MenuSubButton key={to} href={to} active={at(to)}>
                          {label}
                        </Sidebar.MenuSubButton>
                      ))}
                    </Sidebar.MenuSub>
                  </Sidebar.CollapsibleContent>
                </Sidebar.Collapsible>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Group>
          {user?.role === 'admin' && (
            <Sidebar.Group>
              <Sidebar.GroupLabel>Admin</Sidebar.GroupLabel>
              <Sidebar.Menu>
                <NavItem icon={Pulse} to="/monitoring" active={at('/monitoring')} label="Monitoring" />
                <NavItem icon={UsersThree} to="/users" active={at('/users')} label="Pengguna" />
              </Sidebar.Menu>
            </Sidebar.Group>
          )}
          <Sidebar.Group>
            <Sidebar.GroupLabel>Akun</Sidebar.GroupLabel>
            <Sidebar.Menu>
              <NavItem icon={GearSix} to="/profile" active={at('/profile')} label="Kelola akun" />
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>

        <Sidebar.Footer>
          <Sidebar.Trigger aria-label="Ciutkan atau perluas sidebar" className="hidden md:flex" />
        </Sidebar.Footer>
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-topbar flex h-[58px] shrink-0 items-center justify-end gap-1 border-b border-kumo-line bg-kumo-base px-4 lg:px-6">
          <MobileNavigationTrigger />
          <a href={PUBLIC_SITE} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-kumo-default transition hover:bg-kumo-tint">
            <ArrowSquareOut size={16} />
            Lihat website
          </a>
          <AccountMenu />
        </header>
        <div className="admin-scroll min-h-0 flex-1 !shrink overflow-y-auto">{children}</div>
      </div>

      <SearchPalette open={search} onOpenChange={setSearch} />
    </Sidebar.Provider>
  )
}

/** A sidebar entry: icon and name (the name shows as a tooltip when the sidebar is folded). */
function NavItem({ icon, to, active, label }: { icon: Icon; to: string; active: boolean; label: string }) {
  return (
    <Sidebar.MenuButton icon={icon} href={to} active={active} tooltip={label}>
      {label}
    </Sidebar.MenuButton>
  )
}

/** Logo and name; just the logo when the sidebar is folded. */
function Brand() {
  const { state, isMobile } = useSidebar()
  const folded = !isMobile && state === 'collapsed'
  return (
    <Link to="/" className={`flex w-full items-center gap-2.5 rounded-lg py-1.5 transition hover:bg-kumo-tint ${folded ? 'justify-center px-0' : 'px-2'}`} aria-label="Kadanglabo, ke Ringkasan">
      <img src="/brand/kadanglabo-mark.svg" alt="" className="size-7 shrink-0" />
      {!folded && <span className="truncate text-[15px] font-semibold text-kumo-strong">Kadanglabo</span>}
    </Link>
  )
}

/** The quick search field; a single magnifier when the sidebar is folded. */
function SearchButton({ onOpen }: { onOpen: () => void }) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const openSearch = () => { setOpenMobile(false); onOpen() }
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
  if (!isMobile && state === 'collapsed')
    return (
      <div className="flex justify-center pb-1 pt-3">
        <button onClick={openSearch} className="grid size-8 place-items-center rounded-lg text-kumo-subtle ring-1 ring-kumo-line transition hover:bg-kumo-tint hover:text-kumo-default" aria-label="Cari cepat" title={`Cari cepat (${isMac ? '⌘' : 'Ctrl'} K)`}>
            <MagnifyingGlass size={17} />
          </button>
      </div>
    )
  return (
    <div className="pb-1 pt-3">
      <button onClick={openSearch} className="flex h-8 w-full items-center gap-2 rounded-lg bg-kumo-base px-2.5 text-[13px] text-kumo-subtle ring-1 ring-kumo-line transition hover:ring-kumo-fill">
        <MagnifyingGlass size={14} />
        <span className="flex-1 text-left">Cari cepat…</span>
        <kbd className="font-sans text-[11px] text-kumo-inactive">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
    </div>
  )
}

/** Top right: who is signed in, and the way to settings or out. */
function AccountMenu() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <button className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm text-kumo-default transition hover:bg-kumo-tint data-[popup-open]:bg-kumo-tint" aria-label="Menu akun">
            <Avatar />
            <span className="hidden max-w-36 truncate font-medium sm:block">{user?.name}</span>
            <CaretDown size={13} className="text-kumo-subtle" />
          </button>
        }
      />
      <DropdownMenu.Content align="end" sideOffset={8} className="w-64">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-kumo-strong">{user?.name}</p>
            <p className="truncate text-xs text-kumo-subtle">
              @{user?.username} · {user?.role === 'admin' ? 'Admin' : 'Editor'}
            </p>
          </div>
        </div>
        <DropdownMenu.Separator />
        <DropdownMenu.Item icon={UserCircle} onClick={() => navigate('/profile')}>
          Profil & password
        </DropdownMenu.Item>
        {user?.role === 'admin' && (
          <DropdownMenu.Item icon={UsersThree} onClick={() => navigate('/users')}>
            Kelola pengguna
          </DropdownMenu.Item>
        )}
        <DropdownMenu.LinkItem href={PUBLIC_SITE} target="_blank" icon={ArrowSquareOut}>
          Buka website
        </DropdownMenu.LinkItem>
        <DropdownMenu.Separator />
        <DropdownMenu.Item icon={SignOut} variant="danger" onClick={() => void logout()}>
          Keluar
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

/** A person in a soft circle (no initials). */
export function Avatar({ size = 'base' }: { size?: 'base' | 'lg' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-kumo-recessed text-kumo-subtle ring-1 ring-kumo-hairline ${size === 'lg' ? 'size-10' : 'size-8'}`}>
      <User size={size === 'lg' ? 20 : 16} weight="bold" />
    </span>
  )
}

function MobileNavigationTrigger() {
  const { isMobile, openMobile, toggleSidebar } = useSidebar()
  if (!isMobile) return null
  return <button type="button" onClick={toggleSidebar} aria-label="Buka navigasi" aria-expanded={openMobile} className="mr-auto flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-kumo-tint"><List size={22} />Menu</button>
}

function CloseNavigationOnRouteChange() {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  useEffect(() => { setOpenMobile(false) }, [pathname, setOpenMobile])
  return null
}
