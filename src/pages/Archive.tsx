import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { ArchiveTable } from '../components/ArchiveTable'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { archive, categoryOrder, categoryTitle } from '../data/projects'
import { tr } from '../lib/i18n'

/*
 * The whole project archive on one page (/work/archive), opened from the bottom of Our Work once the archive is
 * longer than its first rows. It opens like Our Work: the big title, one line, the sector shortcuts; then the table.
 */
export default function Archive() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root, () => {})

  return (
    <Page
      title={tr('Project archive', 'Arsip proyek')}
      description={tr(
        'Every Kadanglabo project since 2020, from family homes to healthcare facilities. Filter by sector, location, year and status.',
        'Semua proyek Kadanglabo sejak 2020, dari rumah tinggal sampai fasilitas kesehatan. Saring menurut sektor, lokasi, tahun, dan status.',
      )}
    >
      <div ref={root}>
        <PageHero
          title={tr('Archive', 'Arsip')}
          sub={tr(
            `Every project since 2020, ${archive.length} in all: filter by sector, location or status.`,
            `Semua proyek sejak 2020, total ${archive.length}: saring berdasarkan sektor, lokasi, atau status.`,
          )}
        >
          <nav className="work-nav" aria-label={tr('Sectors', 'Sektor')} data-fade="now" data-delay="0.6">
            <TLink to="/work" className="chip-btn">
              ← {tr('Our work', 'Proyek')}
            </TLink>
            {categoryOrder.map((c) => (
              <TLink key={c} to={`/work/${c}`} className="chip-btn">
                {categoryTitle[c]}
              </TLink>
            ))}
          </nav>
        </PageHero>
        <ArchiveTable id="arsip" />
      </div>
    </Page>
  )
}
