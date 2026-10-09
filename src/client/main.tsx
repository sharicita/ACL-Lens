import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import { APP_CSS } from './styles.generated'

// styles ship inside the cache-busted JS bundle (see now.prebuild.mjs)
const style = document.createElement('style')
style.setAttribute('data-acl-lens', '')
style.textContent = APP_CSS
document.head.appendChild(style)

const rootElement = document.getElementById('root')
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    )
}
