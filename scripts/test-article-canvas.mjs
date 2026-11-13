import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Exercise the actual save sanitizer and public block renderer together.
const result = await build({
  stdin: {
    resolveDir: resolve('.'), loader: 'tsx', contents: `
      import assert from 'node:assert/strict'
      import { renderToStaticMarkup } from 'react-dom/server'
      import { cleanDoc } from './admin/worker/validate'
      import { ArticleCard } from './src/components/ArticleCard'
      import { RichText } from './src/components/RichText'
      import { docText } from './shared/content'
      import { safeArticleUrl, videoEmbed } from './shared/article-blocks'
      const cards = [
        { kind: 'table', header: ['Material', 'Catatan'], rows: [['Kayu', 'Tahan lama']], caption: 'Bahan bangunan' },
        { kind: 'callout', tone: 'tip', text: 'Perhatikan arah matahari.' },
        { kind: 'cta', label: 'Hubungi kami', href: '/contact' },
        { kind: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ', caption: 'Video projek' },
      ]
      const original = { type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Pembuka', marks: [{ type: 'bold' }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Subjudul' }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kutipan' }] }] },
        { type: 'image', attrs: { id: 'gambar-1', caption: 'Tapak', alt: 'Tapak di tepi sungai', layout: 'wide' } },
        { type: 'codeBlock', content: [{ type: 'text', text: '<script>contoh</script>\\nbaris kedua' }] },
        { type: 'horizontalRule' },
        ...cards.map(data => ({ type: 'articleCard', attrs: { data } })),
      ] }
      const saved = cleanDoc(original)
      assert.deepEqual(saved, original, 'Every supported block survives saving')
      assert.deepEqual(cleanDoc(JSON.parse(JSON.stringify(saved))), original, 'Reloading preserves every block')
      const html = saved.content.filter(b => b.type === 'articleCard').map(b => renderToStaticMarkup(<ArticleCard data={b.attrs.data} />)).join('')
      for (const expected of ['<table', 'Kayu', 'Bahan bangunan', 'article-callout--tip', 'Hubungi kami', 'href="/contact"', '<iframe', 'youtube-nocookie.com/embed/dQw4w9WgXcQ']) assert.ok(html.includes(expected), expected)
      const fallback = renderToStaticMarkup(<ArticleCard data={{ kind: 'embed', url: 'https://example.com/story', caption: 'Referensi' }} />)
      assert.ok(fallback.includes('<a ')); assert.ok(!fallback.includes('<iframe'))
      const escaped = renderToStaticMarkup(<ArticleCard data={{ kind: 'callout', tone: 'note', text: '<script>alert(1)</script>' }} />)
      assert.ok(escaped.includes('&lt;script&gt;')); assert.ok(!escaped.includes('<script>'))
      const unsafe = cleanDoc({ type: 'doc', content: [{ type: 'articleCard', attrs: { data: { kind: 'cta', label: 'Unsafe', href: 'javascript:alert(1)' } } }] })
      assert.equal(unsafe.content[0].attrs.data.href, '')
      assert.equal(renderToStaticMarkup(<ArticleCard data={unsafe.content[0].attrs.data} />), '')
      assert.equal(videoEmbed('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'), null)
      assert.equal(videoEmbed('https://vimeo.com/12345'), 'https://player.vimeo.com/video/12345')
      assert.equal(videoEmbed('https://example.com/'), null)
      const legacy = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Artikel lama' }] }] }
      assert.deepEqual(cleanDoc(legacy), legacy)

      const nested = { type: 'doc', content: [{ type: 'blockquote', content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Subjudul dalam kutipan' }] },
        { type: 'orderedList', attrs: { start: 5 }, content: [{ type: 'listItem', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Paragraf satu' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Paragraf dua' }] },
          { type: 'articleCard', attrs: { data: cards[0] } },
          { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Anak daftar' }] }] }] },
        ] }] },
        { type: 'codeBlock', content: [{ type: 'text', text: 'kode di kutipan' }] },
      ] }] }
      assert.deepEqual(cleanDoc(nested), nested, 'Combined tools must not lose nested content')
      const full = renderToStaticMarkup(<RichText value={{ id: saved, en: saved }} className="art-p" />)
      for (const token of ['<h2', '<blockquote', '<img', 'alt="Tapak di tepi sungai"', 'rich-figure--wide', '<pre', '&lt;script&gt;contoh', 'baris kedua', '<hr', '<table', '<iframe']) assert.ok(full.includes(token), token)
      const nestedHtml = renderToStaticMarkup(<RichText value={{ id: cleanDoc(nested), en: cleanDoc(nested) }} className="art-p" />)
      for (const token of ['<h3', '<ol', 'start="5"', 'Paragraf satu</span></p><p', '<table', '<ul', 'Anak daftar', 'kode di kutipan']) assert.ok(nestedHtml.includes(token), token)
      assert.ok(docText(nested).includes('Kayu'), 'Card content must be searchable')
      assert.equal(safeArticleUrl('example.com/contact'), 'https://example.com/contact')
      assert.equal(safeArticleUrl('/contact'), '/contact')
      assert.equal(safeArticleUrl('javascript:alert(1)'), '')
      assert.equal(safeArticleUrl('/\\\\evil.test'), '')
      assert.equal(videoEmbed('youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
      assert.equal(videoEmbed('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
      console.log('PASS: canvas save/reload, public block rendering, legacy paragraphs, and safe embeds/links')
    `,
  },
  plugins: [{ name: 'render-context', setup(api) {
    // Render the real RichText component without requiring the browser's app/router globals.
    api.onResolve({ filter: /lib\/(i18n|transition)$/ }, args => ({ path: args.path.endsWith('i18n') ? 'i18n' : 'transition', namespace: 'render-context' }))
    api.onLoad({ filter: /.*/, namespace: 'render-context' }, args => ({ resolveDir: resolve('.'), loader: 'tsx', contents: args.path === 'i18n' ? "export const getLang = () => 'id'; export const t = v => v.id;" : "export const TLink = ({ to, children }) => <a href={to}>{children}</a>;" }))
  } }],
  bundle: true, platform: 'node', format: 'esm', write: false,
  jsx: 'automatic', external: ['node:*'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
})
const output = join(await mkdtemp(join(tmpdir(), 'kadanglabo-canvas-')), 'test.mjs')
await writeFile(output, result.outputFiles[0].contents)
await import(pathToFileURL(output).href)
