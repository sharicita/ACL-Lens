// ACL Lens guided setup - page logic. Talks only to the local setup server.
;(function () {
    'use strict'

    // The one-time token arrives in the address fragment (never sent over the network); keep it
    // for this tab only and remove it from the address bar.
    var token = location.hash.slice(1) || sessionStorage.getItem('acl-lens-setup') || ''
    try {
        sessionStorage.setItem('acl-lens-setup', token)
    } catch (e) {
        /* private mode: the token stays in memory */
    }
    if (location.hash) history.replaceState(null, '', location.pathname)

    var state = { step: 1, status: null, alias: '', instance: '', inspect: null, scope: '', scopeId: '', profile: '' }
    var $ = function (id) {
        return document.getElementById(id)
    }

    function call(method, url, body) {
        return fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'X-Setup-Token': token },
            body: body ? JSON.stringify(body) : undefined,
        }).then(function (r) {
            return r.json().then(function (data) {
                if (!r.ok) throw new Error(data.error || 'Something went wrong.')
                return data
            })
        })
    }

    function say(text) {
        $('status').textContent = text
    }
    function showError(text) {
        var el = $('error')
        el.textContent = text || ''
        el.hidden = !text
    }
    function busy(btn, on, label) {
        if (!btn) return
        if (on) {
            btn.dataset.label = btn.textContent
            btn.textContent = label || 'Working…'
        } else if (btn.dataset.label) btn.textContent = btn.dataset.label
        btn.disabled = on
        btn.setAttribute('aria-busy', on ? 'true' : 'false')
    }

    function go(step) {
        showError('')
        state.step = step
        document.querySelectorAll('[data-panel]').forEach(function (p) {
            p.hidden = Number(p.dataset.panel) !== step
        })
        document.querySelectorAll('#steps li').forEach(function (li) {
            var n = Number(li.dataset.step)
            li.classList.toggle('done', n < step)
            if (n === step) li.setAttribute('aria-current', 'step')
            else li.removeAttribute('aria-current')
        })
        var h = $('h' + step)
        if (h) h.focus()
        if (step === 2) renderLogins()
        if (step === 3) inspect()
        if (step === 4) renderSummary()
    }

    // ---- step 1 ------------------------------------------------------------------------------
    function check(id, ok, text) {
        var el = $(id)
        el.className = ok ? 'ok' : 'bad'
        el.innerHTML = ''
        var icon = document.createElement('span')
        icon.className = 'icon'
        icon.setAttribute('aria-hidden', 'true')
        icon.textContent = ok ? '✓' : '!'
        el.appendChild(icon)
        el.appendChild(document.createTextNode(text))
    }

    function loadStatus() {
        return call('GET', '/api/status').then(function (s) {
            state.status = s
            check('check-node', s.nodeOk, s.nodeOk ? 'Node.js ' + s.node + ' is installed.' : 'Node.js ' + s.node + ' is too old. Install version ' + s.nodeMin + ' or newer from nodejs.org, then run the setup again.')
            check('check-deps', s.depsInstalled, s.depsInstalled ? 'The ServiceNow SDK and build tools are installed.' : 'The ServiceNow SDK is not installed in this folder yet.')
            $('btn-deps').hidden = s.depsInstalled || !s.nodeOk
            $('btn-next-1').disabled = !(s.nodeOk && s.depsInstalled)
            return s
        })
    }

    function follow(logEl, onDone) {
        var since = 0
        logEl.hidden = false
        function tick() {
            call('GET', '/api/job?since=' + since)
                .then(function (j) {
                    if (j.lines.length) {
                        logEl.textContent += j.lines.join('\n') + '\n'
                        logEl.scrollTop = logEl.scrollHeight
                    }
                    since = j.total
                    if (j.running) return setTimeout(tick, 1000)
                    onDone(j)
                })
                .catch(function (e) {
                    onDone({ ok: false, error: e.message })
                })
        }
        tick()
    }

    $('btn-deps').addEventListener('click', function () {
        var btn = this
        busy(btn, true, 'Installing… (1–3 minutes)')
        say('Installing the SDK and build tools. This can take a few minutes.')
        call('POST', '/api/deps')
            .then(function () {
                follow($('log-deps'), function (j) {
                    busy(btn, false)
                    if (!j.ok) return showError(j.error || 'The installation failed. See the output below.')
                    say('Tools installed.')
                    loadStatus()
                })
            })
            .catch(function (e) {
                busy(btn, false)
                showError(e.message)
            })
    })
    $('btn-next-1').addEventListener('click', function () {
        go(2)
    })

    // ---- step 2 ------------------------------------------------------------------------------
    function renderLogins() {
        var logins = (state.status && state.status.logins) || []
        var box = $('login-list')
        box.innerHTML = ''
        $('saved-logins').hidden = !logins.length
        $('add-login').open = !logins.length
        logins.forEach(function (l, i) {
            var id = 'login-' + i
            var wrap = document.createElement('div')
            wrap.className = 'radio'
            var input = document.createElement('input')
            input.type = 'radio'
            input.name = 'login'
            input.id = id
            input.value = l.alias
            input.checked = state.alias ? state.alias === l.alias : i === 0
            input.addEventListener('change', function () {
                pickLogin(l)
            })
            var label = document.createElement('label')
            label.htmlFor = id
            label.innerHTML = '<strong></strong> <span class="muted"></span>'
            label.firstChild.textContent = l.alias
            label.lastChild.textContent = l.host
            wrap.appendChild(input)
            wrap.appendChild(label)
            box.appendChild(wrap)
            if (input.checked) pickLogin(l)
        })
        $('btn-next-2').disabled = !state.alias
    }
    function pickLogin(l) {
        state.alias = l.alias
        state.instance = l.host
        $('btn-next-2').disabled = false
    }

    $('f-instance').addEventListener('change', function () {
        var alias = $('f-alias')
        if (alias.value) return
        var m = this.value.match(/(?:https?:\/\/)?([a-z0-9-]+)/i)
        if (m) alias.value = m[1].toLowerCase()
    })

    $('form-login').addEventListener('submit', function (ev) {
        ev.preventDefault()
        var btn = $('btn-login')
        var body = { instance: $('f-instance').value, username: $('f-user').value, password: $('f-pass').value, alias: $('f-alias').value.trim() }
        busy(btn, true, 'Checking…')
        showError('')
        call('POST', '/api/login', body)
            .then(function (r) {
                $('f-pass').value = ''
                state.alias = r.alias
                state.instance = r.instance
                say('Login saved for ' + r.instance + '.')
                return loadStatus()
            })
            .then(function () {
                busy(btn, false)
                renderLogins()
                $('btn-next-2').focus()
            })
            .catch(function (e) {
                busy(btn, false)
                showError('The login could not be saved: ' + e.message + ' Check the address, user name and password.')
            })
    })
    $('btn-next-2').addEventListener('click', function () {
        go(3)
    })

    // ---- step 3 ------------------------------------------------------------------------------
    var SCOPE_RE = /^x_[a-z0-9_]+$/
    function scopeProblem(s) {
        if (!SCOPE_RE.test(s)) return 'Use only lowercase letters, numbers and underscores, starting with x_.'
        if (s.length > 18) return 'Too long: ' + s.length + ' characters (the limit is 18).'
        return ''
    }

    function option(id, title, detail, checked, onPick) {
        var wrap = document.createElement('div')
        wrap.className = 'radio'
        var input = document.createElement('input')
        input.type = 'radio'
        input.name = 'scope-mode'
        input.id = id
        input.checked = checked
        input.addEventListener('change', onPick)
        var label = document.createElement('label')
        label.htmlFor = id
        var strong = document.createElement('strong')
        strong.textContent = title
        var span = document.createElement('span')
        span.className = 'muted block'
        span.textContent = detail
        label.appendChild(strong)
        label.appendChild(span)
        wrap.appendChild(input)
        wrap.appendChild(label)
        $('scope-options').appendChild(wrap)
        if (checked) onPick()
    }

    function useExisting(app) {
        state.scope = app.scope
        state.scopeId = app.sys_id
        $('scope-field').hidden = true
        validateStep3()
    }
    function useNew() {
        state.scopeId = ''
        $('scope-field').hidden = false
        $('f-scope').value = state.scope && !state.inspect.existing.some(function (a) { return a.scope === state.scope }) ? state.scope : state.inspect.suggested
        checkScope()
    }

    function inspect() {
        $('btn-next-3').disabled = true
        $('scope-choice').hidden = true
        $('scope-field').hidden = true
        $('profile-field').hidden = true
        $('inspect-status').hidden = false
        $('inspect-text').textContent = 'Looking at your instance… (this can take up to 20 seconds)'
        $('inspect-status').classList.add('progress')
        call('POST', '/api/inspect', { alias: state.alias })
            .then(function (r) {
                state.inspect = r
                state.instance = r.instance || state.instance
                $('inspect-status').classList.remove('progress')
                $('inspect-text').textContent = r.companyCode
                    ? 'Your instance\'s company code is "' + r.companyCode + '", so the suggested scope is ' + r.suggested + '.'
                    : 'Your instance has no company code set, so the suggested scope is ' + r.suggested + '.'
                $('scope-options').innerHTML = ''
                r.existing.forEach(function (app, i) {
                    option('scope-existing-' + i, 'Update the ACL Lens already installed (' + app.scope + ', version ' + (app.version || '?') + ')', 'Recommended. Keeps your history, settings and AI providers.', i === 0, function () {
                        useExisting(app)
                    })
                })
                option('scope-new', 'Install a new copy', r.existing.length ? 'Only if you really want a second, separate app.' : 'ACL Lens is not installed on this instance yet.', !r.existing.length, useNew)
                $('scope-choice').hidden = false
                $('profile-field').hidden = false
                // reuse the local profile that already points at this install, if there is one
                var saved = (state.status && state.status.profiles && state.status.profiles.profiles) || {}
                var match = Object.keys(saved).filter(function (n) {
                    return r.existing.some(function (a) { return a.sys_id === saved[n].scopeId })
                })[0]
                if (match) $('f-profile').value = match
                else if (!$('f-profile').value) $('f-profile').value = (state.alias || 'pdi').toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32)
                validateStep3()
            })
            .catch(function (e) {
                $('inspect-status').hidden = true
                showError('Could not read your instance: ' + e.message)
            })
    }

    var scopeTimer = 0
    function checkScope() {
        var s = $('f-scope').value.trim()
        state.scope = s
        var msg = $('f-scope-check')
        var problem = scopeProblem(s)
        $('btn-next-3').disabled = true
        if (problem) {
            msg.textContent = problem
            msg.className = 'hint bad'
            return
        }
        msg.textContent = 'Checking whether the name is free…'
        msg.className = 'hint'
        clearTimeout(scopeTimer)
        scopeTimer = setTimeout(function () {
            call('POST', '/api/check-scope', { alias: state.alias, scope: s })
                .then(function (r) {
                    if ($('f-scope').value.trim() !== s) return
                    if (r.taken) {
                        msg.textContent = 'Already used on this instance by "' + (r.app && r.app.name) + '". Choose another name.'
                        msg.className = 'hint bad'
                        return
                    }
                    if (state.inspect.prefix !== 'x_' && s.indexOf(state.inspect.prefix) !== 0) {
                        msg.textContent = 'Available, but it does not start with your company prefix ' + state.inspect.prefix + ', so the install may be refused.'
                        msg.className = 'hint warn'
                    } else {
                        msg.textContent = 'Available.'
                        msg.className = 'hint ok'
                    }
                    validateStep3()
                })
                .catch(function (e) {
                    msg.textContent = e.message
                    msg.className = 'hint bad'
                })
        }, 350)
    }
    $('f-scope').addEventListener('input', checkScope)
    $('f-profile').addEventListener('input', validateStep3)

    function validateStep3() {
        var nameOk = /^[a-z0-9][a-z0-9_-]{0,31}$/.test($('f-profile').value)
        var scopeOk = !!state.scope && !scopeProblem(state.scope) && (state.scopeId || /ok|warn/.test($('f-scope-check').className))
        $('btn-next-3').disabled = !(nameOk && scopeOk)
    }

    $('btn-next-3').addEventListener('click', function () {
        state.profile = $('f-profile').value
        go(4)
    })

    // ---- step 4 ------------------------------------------------------------------------------
    function renderSummary() {
        var rows = [
            ['Instance', state.instance],
            ['Login', state.alias],
            ['Scope', state.scope],
            ['What happens', state.scopeId ? 'Update the existing install' : 'New install'],
            ['Profile', state.profile],
        ]
        var dl = $('summary')
        dl.innerHTML = ''
        rows.forEach(function (r) {
            var dt = document.createElement('dt')
            dt.textContent = r[0]
            var dd = document.createElement('dd')
            dd.textContent = r[1]
            dl.appendChild(dt)
            dl.appendChild(dd)
        })
    }

    function phase(line) {
        if (/Preparing/.test(line)) return 'Preparing your copy of the app…'
        if (/Type check|Building project|prebuild/i.test(line)) return 'Building the app…'
        if (/Starting installation|log into/i.test(line)) return 'Sending the app to your instance…'
        if (/Rollback/.test(line)) return 'Installing on your instance (this is the longest part)…'
        return ''
    }

    $('btn-install').addEventListener('click', function () {
        var btn = this
        showError('')
        busy(btn, true, 'Installing…')
        $('install-progress').hidden = false
        $('log-wrap').hidden = false
        $('log-install').textContent = ''
        say('Installing. This usually takes 2 to 5 minutes.')
        call('POST', '/api/profile', { name: state.profile, alias: state.alias, scope: state.scope, scopeId: state.scopeId, instance: state.instance })
            .then(function () {
                return call('POST', '/api/install', { name: state.profile })
            })
            .then(function () {
                var log = $('log-install')
                var observer = new MutationObserver(function () {
                    var lines = log.textContent.trim().split('\n')
                    for (var i = lines.length - 1; i >= 0; i--) {
                        var p = phase(lines[i])
                        if (p) {
                            $('install-phase').textContent = p
                            break
                        }
                    }
                })
                observer.observe(log, { childList: true, characterData: true, subtree: true })
                follow(log, function (j) {
                    observer.disconnect()
                    busy(btn, false)
                    $('install-progress').hidden = true
                    if (!j.ok) {
                        $('log-wrap').open = true
                        return showError('The install did not finish: ' + (j.error || 'see the technical details below') + ' You can fix the problem and press Install again.')
                    }
                    finish()
                })
            })
            .catch(function (e) {
                busy(btn, false)
                $('install-progress').hidden = true
                showError(e.message)
            })
    })

    // ---- step 5 ------------------------------------------------------------------------------
    function finish() {
        var base = (state.instance || '').replace(/\/$/, '')
        $('done-instance').textContent = base
        $('link-app').href = base + '/' + state.scope + '_lens.do'
        $('link-roles').href = base + '/sys_user_role_list.do?sysparm_query=' + encodeURIComponent('nameSTARTSWITH' + state.scope + '.')
        $('link-ai').href = base + '/' + state.scope + '_ai_provider_list.do'
        $('role-user').textContent = state.scope + '.user'
        $('role-admin').textContent = state.scope + '.admin'
        $('explicit-roles').hidden = !(state.inspect && state.inspect.explicitRoles)
        go(5)
        say('ACL Lens is installed.')
    }

    $('btn-another').addEventListener('click', function () {
        state.alias = ''
        state.scope = ''
        state.scopeId = ''
        $('f-profile').value = ''
        loadStatus().then(function () {
            go(2)
        })
    })
    $('btn-quit').addEventListener('click', function () {
        call('POST', '/api/quit').finally(function () {
            document.querySelector('main').innerHTML = '<h1 tabindex="-1" id="bye">Setup closed</h1><p>You can close this browser tab. Run <code>npm run setup</code> to open it again.</p>'
            $('bye').focus()
        })
    })

    document.querySelectorAll('[data-back]').forEach(function (b) {
        b.addEventListener('click', function () {
            go(Number(b.dataset.back))
        })
    })

    // ---- start ---------------------------------------------------------------------------------
    if (!token) {
        showError('Open the setup using the address printed in the terminal (it includes a one-time key).')
        return
    }
    loadStatus()
        .then(function () {
            go(1)
        })
        .catch(function (e) {
            showError(e.message)
        })
})()
