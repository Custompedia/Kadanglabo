import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { Popover, Button, DropdownMenu } from '@cloudflare/kumo'
import { LinkSimple, ListBullets, ListNumbers, TextB, TextItalic, TextTSlash, ArrowUUpLeft, ArrowUUpRight, TextHTwo, TextHThree, Quotes, ImageSquare, CloudArrowUp, ImagesSquare } from '@phosphor-icons/react'
import { Photo } from './PhotoNode'
import { MediaPicker } from './MediaPicker'
import { useUploads } from './Upload'
import { ACCEPT } from '../lib/image'
import type { Doc } from '../../../shared/content'

/*
 * The rich text editor: paragraphs, bold, italic, bulleted and numbered lists, links. Nothing else, so what is
 * written here is exactly what the website can show (the API drops anything outside this set as well).
 * Shortcuts: Ctrl/⌘ B, I, K (link), Shift+Ctrl/⌘ 8 / 7 (lists); "- " or "1. " at the start of a line starts a list.
 */

/**
 * `article` turns on what a long article needs as well: subheadings, quotes and photos inside the text (insert from
 * the toolbar, or drop or paste image files straight into the text), on a borderless page with a sticky toolbar.
 */
export function RichEditor({ value, onChange, placeholder, lang, article }: { value: Doc; onChange: (d: Doc) => void; placeholder?: string; lang: string; article?: boolean }) {
  // photos dropped or pasted into the text: uploaded, then placed where they landed
  const at = useRef<number | null>(null)
  const { jobs, add } = useUploads((u) => {
    const ed = editorRef.current
    if (!ed) return
    const pos = at.current ?? ed.state.selection.to
    ed.chain().focus().insertContentAt(pos, [{ type: 'image', attrs: { id: u.id, caption: '' } }, { type: 'paragraph' }]).run()
    at.current = null
  })
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const files = (list: FileList | undefined | null) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: article ? { levels: [2, 3] } : false,
        blockquote: article ? {} : false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener', target: null } },
      }),
      Placeholder.configure({ placeholder: placeholder ?? (lang === 'en' ? 'Write in English…' : 'Tulis dalam Bahasa Indonesia…') }),
      ...(article ? [Photo] : []),
    ],
    content: value,
    editorProps: {
      attributes: { class: article ? 'rt rt--article' : 'rt', lang, spellcheck: 'true' },
      ...(article && {
        handleDrop: (view, event) => {
          const list = files((event as DragEvent).dataTransfer?.files)
          if (!list.length) return false
          event.preventDefault()
          at.current = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })?.pos ?? null
          void add(list)
          return true
        },
        handlePaste: (_view, event) => {
          const list = files(event.clipboardData?.files)
          if (!list.length) return false
          event.preventDefault()
          void add(list)
          return true
        },
      }),
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as Doc),
  })
  editorRef.current = editor
  const job = jobs.find((j) => !j.error)

  return (
    <div className={article ? 'relative' : 'overflow-hidden rounded-lg bg-kumo-base ring-1 ring-kumo-line focus-within:ring-[1.5px] focus-within:ring-kumo-focus/60'}>
      {editor && <Toolbar editor={editor} article={article} onUpload={(f) => void add(f)} />}
      {job && (
        <p className="my-2 rounded-md bg-kumo-recessed px-3 py-2 text-xs text-kumo-subtle">
          Mengunggah {job.name}… {Math.round(job.progress * 100)}%
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor, article, onUpload }: { editor: Editor; article?: boolean; onUpload: (f: File[]) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      link: e.isActive('link'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      quote: e.isActive('blockquote'),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()
  return (
    <div className={`flex flex-wrap items-center gap-0.5 px-1.5 py-1 ${article ? 'sticky top-[86px] z-10 rounded-lg bg-kumo-base shadow-sm ring-1 ring-kumo-line' : 'border-b border-kumo-hairline bg-kumo-recessed/50'}`} role="toolbar" aria-label="Format teks">
      {article && (
        <>
          <Tool label="Subjudul besar" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} icon={<TextHTwo size={17} />} />
          <Tool label="Subjudul kecil" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} icon={<TextHThree size={17} />} />
          <Sep />
        </>
      )}
      <Tool label="Tebal (Ctrl B)" active={s.bold} onClick={() => chain().toggleBold().run()} icon={<TextB size={16} weight="bold" />} />
      <Tool label="Miring (Ctrl I)" active={s.italic} onClick={() => chain().toggleItalic().run()} icon={<TextItalic size={16} />} />
      <Sep />
      <Tool label="Daftar berpoin" active={s.bullet} onClick={() => chain().toggleBulletList().run()} icon={<ListBullets size={16} />} />
      <Tool label="Daftar bernomor" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} icon={<ListNumbers size={16} />} />
      <Sep />
      {article && <Tool label="Kutipan" active={s.quote} onClick={() => chain().toggleBlockquote().run()} icon={<Quotes size={16} />} />}
      <LinkTool editor={editor} active={s.link} />
      {article && <PhotoTool editor={editor} onUpload={onUpload} />}
      <Tool label="Hapus format" onClick={() => chain().unsetAllMarks().clearNodes().run()} icon={<TextTSlash size={16} />} />
      <span className="flex-1" />
      <Tool label="Urungkan" disabled={!s.undo} onClick={() => chain().undo().run()} icon={<ArrowUUpLeft size={16} />} />
      <Tool label="Ulangi" disabled={!s.redo} onClick={() => chain().redo().run()} icon={<ArrowUUpRight size={16} />} />
    </div>
  )
}

const Sep = () => <span className="mx-1 h-4 w-px bg-kumo-line" />

function Tool({ label, active, onClick, icon, disabled }: { label: string; active?: boolean; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the selection in the editor
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-md transition disabled:opacity-35 ${active ? 'bg-kumo-base text-kumo-strong shadow-sm ring-1 ring-kumo-line' : 'text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default'}`}
    >
      {icon}
    </button>
  )
}

function LinkTool({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')
  useEffect(() => {
    if (open) setHref((editor.getAttributes('link').href as string) ?? '')
  }, [open, editor])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && editor.isFocused) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [editor])

  const apply = () => {
    const url = href.trim()
    if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else {
      const full = /^(https?:\/\/|mailto:|tel:|\/)/i.test(url) ? url : `https://${url}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: full }).run()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={(p) => (
          <button
            {...p}
            type="button"
            title="Tautan (Ctrl K)"
            aria-label="Tautan"
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            className={`grid size-8 place-items-center rounded-md transition ${active ? 'bg-kumo-base text-kumo-strong shadow-sm ring-1 ring-kumo-line' : 'text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default'}`}
          >
            <LinkSimple size={16} />
          </button>
        )}
      />
      <Popover.Content className="w-80 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
          className="grid gap-2"
        >
          <label className="text-xs font-medium text-kumo-subtle" htmlFor="rt-link">
            Alamat tautan
          </label>
          <input id="rt-link" autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://… atau /work/la-barka-resort" className="h-9 rounded-md bg-kumo-base px-2.5 text-sm ring-1 ring-kumo-line outline-none focus:ring-kumo-focus/60" />
          <div className="flex justify-end gap-1.5">
            {active && (
              <Button size="sm" variant="ghost" type="button" onClick={() => (setHref(''), editor.chain().focus().extendMarkRange('link').unsetLink().run(), setOpen(false))}>
                Hapus tautan
              </Button>
            )}
            <Button size="sm" variant="primary" type="submit">
              Simpan
            </Button>
          </div>
        </form>
      </Popover.Content>
    </Popover>
  )
}

/** Insert a photo into the text: upload a new one, or pick one already in Media. */
function PhotoTool({ editor, onUpload }: { editor: Editor; onUpload: (f: File[]) => void }) {
  const [picker, setPicker] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger
          render={
            <button type="button" title="Sisipkan foto" aria-label="Sisipkan foto" onMouseDown={(e) => e.preventDefault()} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-default">
              <ImageSquare size={16} /> Foto
            </button>
          }
        />
        <DropdownMenu.Content className="min-w-52">
          <DropdownMenu.Item icon={CloudArrowUp} onClick={() => input.current?.click()}>
            Unggah dari komputer
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={ImagesSquare} onClick={() => setPicker(true)}>
            Pilih foto yang ada
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          onUpload(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      <MediaPicker multiple open={picker} onOpenChange={setPicker} onPick={(ids) => ids.forEach((id) => editor.chain().focus().insertPhoto({ id }).run())} />
    </>
  )
}
