export type ViewName = 'workspace' | 'history' | 'run' | 'settings' | 'list'

export interface ViewState {
    view: ViewName
    id: string | null
    /** report list kind (view=list) */
    list?: string | null
}

export function getViewFromUrl(): ViewState {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('view')
    const view: ViewName = v === 'history' || v === 'run' || v === 'settings' || v === 'list' ? v : 'workspace'
    return { view, id: params.get('id'), list: params.get('list') }
}

function fireTop(relativePath: string, title: string) {
    if (window.self !== window.top) {
        const ce = (window as any).CustomEvent
        if (ce && typeof ce.fireTop === 'function') ce.fireTop('magellanNavigator.permalink.set', { relativePath, title })
    }
}

export function setTitle(title: string) {
    fireTop(window.location.pathname + window.location.search, title)
    document.title = title
}

/** Pushes a URLSearchParams route (works standalone and inside the Polaris iframe). */
export function pushView(view: ViewName, id?: string | null, title = 'ACL Lens') {
    const params = new URLSearchParams({ view })
    if (id) params.set('id', id)
    const relativePath = `${window.location.pathname}?${params}`
    fireTop(relativePath, title)
    window.history.pushState({ view, id }, '', relativePath)
    document.title = title
}
