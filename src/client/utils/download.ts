export function csvCell(v: unknown): string {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: unknown[][]): string {
    // BOM so Excel opens UTF-8 correctly
    return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function download(fileName: string, content: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeName(s: string): string {
    return (s || 'acl-lens').replace(/[^a-z0-9_-]+/gi, '_').substring(0, 80)
}
