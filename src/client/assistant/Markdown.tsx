import React from 'react'

/**
 * Minimal Markdown renderer for assistant answers. Produces React elements only (no HTML
 * injection). Links are kept only when they point at this instance.
 */

function safeHref(url: string): string | null {
    try {
        const u = new URL(url, window.location.origin)
        return u.origin === window.location.origin ? u.href : null
    } catch (e) {
        return null
    }
}

function inline(text: string, keyBase: string): React.ReactNode[] {
    const out: React.ReactNode[] = []
    const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s)]+)/g
    let last = 0
    let m: RegExpExecArray | null
    let i = 0
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(text.substring(last, m.index))
        const tok = m[0]
        const key = `${keyBase}-${i++}`
        if (m[1]) out.push(<code key={key}>{tok.slice(1, -1)}</code>)
        else if (m[2]) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>)
        else if (m[3]) {
            const label = tok.substring(1, tok.indexOf(']'))
            const href = safeHref(tok.substring(tok.indexOf('(') + 1, tok.length - 1))
            out.push(
                href ? (
                    <a key={key} href={href} target="_blank" rel="noreferrer">
                        {label}
                    </a>
                ) : (
                    label
                )
            )
        } else {
            const href = safeHref(tok)
            out.push(
                href ? (
                    <a key={key} href={href} target="_blank" rel="noreferrer">
                        {tok}
                    </a>
                ) : (
                    tok
                )
            )
        }
        last = m.index + tok.length
    }
    if (last < text.length) out.push(text.substring(last))
    return out
}

export default function Markdown({ text }: { text: string }) {
    const lines = (text || '').replace(/\r\n/g, '\n').split('\n')
    const blocks: React.ReactNode[] = []
    let i = 0
    let k = 0
    while (i < lines.length) {
        const line = lines[i]
        if (line.startsWith('```')) {
            const code: string[] = []
            i++
            while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
            i++
            blocks.push(
                <pre key={k++} className="lens-md__pre">
                    <code>{code.join('\n')}</code>
                </pre>
            )
            continue
        }
        const h = /^(#{1,4})\s+(.*)$/.exec(line)
        if (h) {
            blocks.push(
                <p key={k++} className="lens-md__h">
                    {inline(h[2], `h${k}`)}
                </p>
            )
            i++
            continue
        }
        if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
            const ordered = /^\s*\d+[.)]\s+/.test(line)
            const items: React.ReactNode[] = []
            while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
                items.push(<li key={items.length}>{inline(lines[i].replace(/^\s*([-*]|\d+[.)])\s+/, ''), `l${k}-${items.length}`)}</li>)
                i++
            }
            blocks.push(ordered ? <ol key={k++}>{items}</ol> : <ul key={k++}>{items}</ul>)
            continue
        }
        if (!line.trim()) {
            i++
            continue
        }
        const para: string[] = []
        while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*([-*]|\d+[.)])\s+)/.test(lines[i])) para.push(lines[i++])
        blocks.push(<p key={k++}>{inline(para.join(' '), `p${k}`)}</p>)
    }
    return <div className="lens-md">{blocks}</div>
}
