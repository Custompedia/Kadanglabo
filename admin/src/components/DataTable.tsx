import type { ReactNode } from 'react'
import { LayerCard, Table } from '@cloudflare/kumo'
import { CaretDown, CaretUp, CaretUpDown } from '@phosphor-icons/react'

/*
 * Tables after the Cloudflare dashboard (Kumo): a card, header cells divided by hairlines, a sort caret on the
 * columns that sort, names as underlined links, rows divided by a line and tinted on hover only.
 */

export type Sort = { key: string; dir: 'asc' | 'desc' }

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <LayerCard className="overflow-hidden p-0">
      <Table className="text-[14px] [&_td]:py-3 [&_tbody_tr]:!bg-kumo-base [&_tbody_tr:hover]:!bg-kumo-tint [&_tbody_tr]:border-t [&_tbody_tr]:border-kumo-hairline [&_tbody_td]:!bg-transparent">{children}</Table>
    </LayerCard>
  )
}

/** A header cell; with `sortKey` it is a button that sorts by that column. */
export function Th({ children, sortKey, sort, onSort, className = '' }: { children?: ReactNode; sortKey?: string; sort?: Sort; onSort?: (s: Sort) => void; className?: string }) {
  const active = sortKey && sort?.key === sortKey
  const Icon = active ? (sort!.dir === 'asc' ? CaretUp : CaretDown) : CaretUpDown
  return (
    <Table.Head className={`h-11 border-r border-kumo-hairline bg-kumo-base text-[13px] font-medium text-kumo-subtle last:border-r-0 ${className}`}>
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort({ key: sortKey, dir: active && sort!.dir === 'asc' ? 'desc' : 'asc' })}
          className="inline-flex items-center gap-1.5 hover:text-kumo-strong"
          aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        >
          {children}
          <Icon size={13} className={active ? 'text-kumo-default' : 'text-kumo-inactive'} />
        </button>
      ) : (
        children
      )}
    </Table.Head>
  )
}

/** The name in a row: the underlined link of the Cloudflare tables. */
export const RowLink = ({ children }: { children: ReactNode }) => (
  <span className="truncate font-medium text-kumo-strong underline decoration-black/30 decoration-1 underline-offset-[5px] group-hover/row:decoration-black/70">{children}</span>
)
