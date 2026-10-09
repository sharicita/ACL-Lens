import React, { useEffect, useState } from 'react'
import { LensApi, McpInfo } from '../services/LensApi'
import ConfigNav from './ConfigNav'
import HelpTip from './HelpTip'

interface Props {
    onNavigate: (view: 'settings' | 'mcp') => void
}

function Copy({ text, label }: { text: string; label: string }) {
    const [done, setDone] = useState(false)
    return (
        <button
            type="button"
            className="lens-btn lens-btn--ghost lens-btn--small"
            onClick={() => {
                navigator.clipboard?.writeText(text).then(() => {
                    setDone(true)
                    setTimeout(() => setDone(false), 1500)
                })
            }}
            aria-label={`Copy ${label}`}
        >
            {done ? 'Copied' : 'Copy'}
        </button>
    )
}

function Snippet({ title, code }: { title: string; code: string }) {
    return (
        <div className="lens-snippet">
            <div className="lens-snippet__head">
                <span>{title}</span>
                <Copy text={code} label={title} />
            </div>
            <pre className="lens-md__pre">
                <code>{code}</code>
            </pre>
        </div>
    )
}

/** Admin page: what the MCP server is, how to turn it on, and how to connect common clients. */
export default function McpSetupView({ onNavigate }: Props) {
    const [info, setInfo] = useState<McpInfo | null>(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState('')
    const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null)

    useEffect(() => {
        LensApi.mcpInfo()
            .then(setInfo)
            .catch((e) => setError(e.message))
    }, [])

    const toggle = async (enabled: boolean) => {
        setBusy('toggle')
        setError('')
        setTest(null)
        try {
            await LensApi.saveSettings({ mcp_enabled: enabled })
            setInfo(await LensApi.mcpInfo())
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    const runTest = async () => {
        setBusy('test')
        setTest(null)
        try {
            setTest(await LensApi.mcpSelfTest())
        } finally {
            setBusy('')
        }
    }

    if (error && !info) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!info) return <p className="lens-muted">Loading…</p>

    const url = info.endpoint
    const claudeCode = `claude mcp add --transport http acl-lens ${url} \\\n  --header "Authorization: Bearer <access token>"`
    const vscode = JSON.stringify(
        {
            servers: {
                'acl-lens': { type: 'http', url, headers: { Authorization: 'Bearer ${input:servicenow-token}' } },
            },
            inputs: [{ id: 'servicenow-token', type: 'promptString', description: 'ServiceNow OAuth access token', password: true }],
        },
        null,
        2
    )
    const curl = `curl -s -X POST "${url}" \\\n  -H "Authorization: Bearer <access token>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

    return (
        <div className="lens-settings">
            <ConfigNav current="mcp" onNavigate={onNavigate} />
            {error && <div className="lens-alert lens-alert--critical">{error}</div>}

            <section className="lens-card" aria-labelledby="mcp-what">
                <div className="lens-card__header">
                    <h2 id="mcp-what">MCP server</h2>
                    <HelpTip label="What is MCP?">
                        <span>
                            The <strong>Model Context Protocol</strong> lets AI tools outside ServiceNow (for example Claude, VS Code or other agents) call the same read-only
                            security tools the in-app Security Assistant uses.
                        </span>
                        <span>The in-app assistant does not need MCP; this is only for outside tools.</span>
                    </HelpTip>
                </div>
                <div className="lens-card__body lens-settings__body">
                    <label className="lens-switch">
                        <input type="checkbox" checked={info.enabled} disabled={!!busy} onChange={(e) => toggle(e.target.checked)} />
                        <span>
                            <strong>Allow MCP clients</strong>
                            <span className="lens-muted">
                                {info.enabled
                                    ? 'On: MCP clients can call ACL Lens with a user who has the ACL Lens user role. Saved immediately.'
                                    : 'Off (default): the endpoint refuses every request. Turn it on only if people will connect AI tools. Saved immediately.'}
                            </span>
                        </span>
                    </label>
                    <ul className="lens-mcp__facts">
                        <li>
                            <strong>Read-only.</strong> No tool can change records, ACLs, roles or users.
                        </li>
                        <li>
                            <strong>Runs as the caller.</strong> Every tool uses the permissions of the user the client signs in as, so it can't see more than that person could
                            in ServiceNow.
                        </li>
                        <li>
                            <strong>Requires</strong> the role <code>{info.required_role}</code> (or admin).
                        </li>
                    </ul>
                </div>
            </section>

            <section className="lens-card" aria-labelledby="mcp-connect">
                <div className="lens-card__header">
                    <h2 id="mcp-connect">Connect a client</h2>
                </div>
                <div className="lens-card__body lens-settings__body">
                    <div className="lens-field">
                        <span className="lens-field__label">Endpoint</span>
                        <div className="lens-mcp__endpoint">
                            <code>{url}</code>
                            <Copy text={url} label="endpoint URL" />
                        </div>
                        <span className="lens-muted">{info.transport}. Protocol version {info.protocol_version}.</span>
                    </div>

                    <ol className="lens-mcp__steps">
                        <li>
                            <strong>Turn on "Allow MCP clients"</strong> above.
                        </li>
                        <li>
                            <strong>Decide who connects.</strong> Each person should sign in as themselves so results match their own access. Avoid shared accounts; if an
                            integration needs one, give it only <code>{info.required_role}</code>.
                        </li>
                        <li>
                            <strong>Set up OAuth</strong> (recommended): in <em>System OAuth → Application Registry</em>, create an OAuth API endpoint for external clients and
                            use its access token as a Bearer token. Basic authentication also works but sends a password with every call.
                        </li>
                        <li>
                            <strong>Add the server to your AI tool</strong> using one of the examples below, then ask it to list the ACL Lens tools.
                        </li>
                        <li>
                            <strong>Check access:</strong> the person needs <code>{info.required_role}</code>, and your network must allow the client to reach this instance.
                        </li>
                    </ol>

                    <Snippet title="Claude Code (terminal)" code={claudeCode} />
                    <Snippet title="VS Code (.vscode/mcp.json)" code={vscode} />
                    <Snippet title="Test with curl" code={curl} />
                    <p className="lens-muted">
                        Clients that only support OAuth with automatic registration may need a small bridge (such as an MCP proxy that adds the Authorization header). Never
                        paste passwords or tokens into shared files; use your client's secret prompts or environment variables.
                    </p>

                    <div className="lens-actions">
                        <button type="button" className="lens-btn lens-btn--secondary" disabled={!!busy} onClick={runTest}>
                            {busy === 'test' ? 'Testing…' : 'Test the endpoint now'}
                        </button>
                        {test && (
                            <span className={test.ok ? 'lens-result lens-result--P' : 'lens-result lens-result--F'} role="status">
                                {test.text}
                            </span>
                        )}
                    </div>
                    <p className="lens-muted lens-mcp__note">The test calls the endpoint as you, from this browser session, and lists the tools it returns.</p>
                </div>
            </section>

            <section className="lens-card" aria-labelledby="mcp-tools">
                <div className="lens-card__header">
                    <h2 id="mcp-tools">What clients get</h2>
                    <span className="lens-muted lens-card__aside">
                        {info.tools.length} tools · {info.prompts.length} prompts · {info.resources.length} guidance documents
                    </span>
                </div>
                <div className="lens-card__body">
                    <details className="lens-mcp__details">
                        <summary>Tools ({info.tools.length})</summary>
                        <dl className="lens-mcp__list">
                            {info.tools.map((t) => (
                                <React.Fragment key={t.name}>
                                    <dt>
                                        <code>{t.name}</code>
                                    </dt>
                                    <dd>{t.description}</dd>
                                </React.Fragment>
                            ))}
                        </dl>
                    </details>
                    <details className="lens-mcp__details">
                        <summary>Prompts ({info.prompts.length})</summary>
                        <dl className="lens-mcp__list">
                            {info.prompts.map((p) => (
                                <React.Fragment key={p.name}>
                                    <dt>
                                        <code>{p.name}</code>
                                    </dt>
                                    <dd>{p.description}</dd>
                                </React.Fragment>
                            ))}
                        </dl>
                    </details>
                    <details className="lens-mcp__details">
                        <summary>Guidance documents ({info.resources.length})</summary>
                        <ul>
                            {info.resources.map((r) => (
                                <li key={r.uri}>
                                    {r.title} <code>{r.uri}</code>
                                </li>
                            ))}
                        </ul>
                    </details>
                </div>
            </section>
        </div>
    )
}
