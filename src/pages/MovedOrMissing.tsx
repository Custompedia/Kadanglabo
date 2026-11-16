import { Navigate, useLocation } from 'react-router'
import { redirectFor } from '../data/redirects'
import NotFound from './NotFound'

/** A detail address that is not live: the page's current address when it only moved (keeping ?lang and #), else 404. */
export function MovedOrMissing({ kind, base, slug }: { kind: 'project' | 'article'; base: string; slug: string | undefined }) {
  const { search, hash } = useLocation()
  const to = slug ? redirectFor(kind, slug) : undefined
  return to ? <Navigate to={`${base}${to}${search}${hash}`} replace /> : <NotFound />
}
