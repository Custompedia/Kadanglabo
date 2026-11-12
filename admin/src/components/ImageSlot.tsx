import { useState } from 'react'
import { Button } from '@cloudflare/kumo'
import { ArrowsClockwise, CloudArrowUp, ImagesSquare, X } from '@phosphor-icons/react'
import { mediaUrl, useMediaMap } from './Thumb'
import { MediaPicker } from './MediaPicker'
import { DropArea, useUploads } from './Upload'

/*
 * One image in a form (cover, hero, a story or gallery photo). Drop a file on it, or pick from the library.
 * Empty, it is a dashed drop target; filled, it shows the photo with Replace / Remove on hover.
 */
export function ImageSlot({
  value,
  onChange,
  label,
  hint,
  aspect = 'aspect-[4/3]',
  className = '',
  natural,
}: {
  value: string
  onChange: (id: string) => void
  label?: string
  hint?: string
  aspect?: string
  className?: string
  /** take the photo's own proportions (as the website shows it, uncropped) */
  natural?: boolean
}) {
  const { map } = useMediaMap()
  const [picker, setPicker] = useState(false)
  const { jobs, add } = useUploads((u) => onChange(u.id))
  const job = jobs[jobs.length - 1]
  const m = value ? map.get(value) : undefined

  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-kumo-default">{label}</span>
          {hint && <span className="text-xs text-kumo-subtle">{hint}</span>}
        </div>
      )}
      <DropArea onFiles={(f) => void add(f.slice(0, 1))}>
        {(active, pick) => (
          <div
            style={natural && m ? { aspectRatio: `${m.w} / ${m.h}` } : undefined}
            className={`group relative overflow-hidden rounded-xl ${natural && m ? '' : aspect} ${
              value ? 'bg-kumo-recessed' : `border border-dashed ${active ? 'border-kumo-brand bg-kumo-info-tint' : 'border-kumo-fill bg-kumo-recessed/60'}`
            }`}
          >
            {value ? (
              <>
                <img src={mediaUrl(m, value, 1280)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ backgroundColor: m?.color }} draggable={false} />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <Button title="Pilih foto yang ada" size="sm" shape="square" aria-label="Ganti foto" icon={<ImagesSquare size={16} />} onClick={() => setPicker(true)} />
                  <Button title="Unggah foto lain" size="sm" shape="square" aria-label="Unggah foto lain" icon={<ArrowsClockwise size={16} />} onClick={pick} />
                  <Button title="Kosongkan" size="sm" shape="square" aria-label="Kosongkan" icon={<X size={16} />} onClick={() => onChange('')} />
                </div>
                {active && <div className="absolute inset-0 grid place-items-center bg-kumo-base/70 text-sm font-medium">Lepaskan untuk mengganti</div>}
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-3 text-center">
                <div>
                  <CloudArrowUp size={24} className="mx-auto text-kumo-subtle" />
                  <p className="mt-1.5 text-sm text-kumo-default">{active ? 'Lepaskan di sini' : 'Seret foto ke sini'}</p>
                  {!active && (
                    <p className="mt-1 text-xs text-kumo-subtle">
                      <button type="button" onClick={pick} className="font-medium text-kumo-link hover:underline">
                        unggah
                      </button>{' '}
                      atau{' '}
                      <button type="button" onClick={() => setPicker(true)} className="font-medium text-kumo-link hover:underline">
                        pilih foto yang ada
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}
            {job && !job.error && (
              <div className="absolute inset-x-0 bottom-0 bg-kumo-base/85 px-3 py-2 backdrop-blur">
                <div className="flex justify-between text-xs">
                  <span className="truncate">{job.name}</span>
                  <span className="tabular-nums text-kumo-subtle">{Math.round(job.progress * 100)}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-kumo-fill">
                  <div className="h-full rounded-full bg-kumo-brand transition-[width]" style={{ width: `${Math.max(4, job.progress * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </DropArea>
      <MediaPicker open={picker} onOpenChange={setPicker} onPick={([id]) => id && onChange(id)} />
    </div>
  )
}
