async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

async function signUp(username, email, password) {
  const redirectTo = window.location.origin + '/The-Official-Relentless-Zombies-Website/login.html'
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username: username }, emailRedirectTo: redirectTo }
  })
  if (error) throw error
  return data
}

async function signOut() {
  const { error } = await sb.auth.signOut()
  if (error) throw error
}

async function getSession() {
  const { data, error } = await sb.auth.getSession()
  if (error) throw error
  return data.session
}

async function getUser() {
  const { data, error } = await sb.auth.getUser()
  if (error) throw error
  return data.user
}

function onAuthChange(callback) {
  sb.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

function buildDropdown(user) {
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User'

  const dropdown = document.createElement('div')
  dropdown.id = 'nav-dropdown'
  dropdown.style.cssText = `
    display:none;position:absolute;top:70px;left:50%;transform:translateX(-50%);
    background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;
    padding:16px;min-width:200px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.6)
  `

  dropdown.innerHTML = `
    <div style="margin-bottom:8px;padding:8px 12px;color:#fff;font-size:13px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">
      Signed in as <span style="color:rgb(255,114,0)">${username}</span>
    </div>
    <a href="${window.location.origin}/The-Official-Relentless-Zombies-Website/account.html" style="display:block;padding:8px 12px;color:#ccc;text-decoration:none;font-size:13px;border-radius:6px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">Manage Account</a>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">
      <a href="#" id="dropdown-signout" style="display:block;padding:8px 12px;color:rgb(19,120,38) !important;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;transition:background 0.15s" onmouseover="this.style.background='rgba(19,120,38,0.1)'" onmouseout="this.style.background='transparent'">Sign Out</a>
    </div>
    <div style="position:absolute;bottom:12px;right:12px">
      <button id="theme-toggle-btn" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center" title="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="theme-icon">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  `

  document.body.appendChild(dropdown)

  const themeBtn = dropdown.querySelector('#theme-toggle-btn')
  const themeIcon = dropdown.querySelector('#theme-icon')
  const currentTheme = localStorage.getItem('theme') || 'dark'

  function updateThemeIcon(theme) {
    if (theme === 'light') {
      themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
    } else {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    }
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.style.setProperty('--theme-bg', '#fff', 'important')
      document.documentElement.style.setProperty('--theme-text', '#000', 'important')
      document.documentElement.style.setProperty('--theme-card-bg', '#f5f5f5', 'important')
      document.documentElement.style.setProperty('--theme-border', 'rgba(0,0,0,0.1)', 'important')
    } else {
      document.documentElement.style.setProperty('--theme-bg', '#000', 'important')
      document.documentElement.style.setProperty('--theme-text', '#fff', 'important')
      document.documentElement.style.setProperty('--theme-card-bg', '#111', 'important')
      document.documentElement.style.setProperty('--theme-border', 'rgba(255,255,255,0.08)', 'important')
    }
    localStorage.setItem('theme', theme)
    updateThemeIcon(theme)
  }

  applyTheme(currentTheme)

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const next = localStorage.getItem('theme') === 'light' ? 'dark' : 'light'
    applyTheme(next)
  })

  const signoutBtn = dropdown.querySelector('#dropdown-signout')
  signoutBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    await signOut()
    dropdown.style.display = 'none'
    window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website/index.html'
  })

  return dropdown
}

function updateNavForUser(user) {
  const signedOutLinks = document.querySelectorAll('.nav-signed-out')
  const signedInLinks = document.querySelectorAll('.nav-signed-in')
  const userNameEl = document.getElementById('nav-user-name')
  const existingDropdown = document.getElementById('nav-dropdown')

  if (existingDropdown) {
    existingDropdown.remove()
  }

  if (user) {
    signedOutLinks.forEach(el => el.style.display = 'none')
    signedInLinks.forEach(el => el.style.display = '')
    if (userNameEl) {
      const displayName = user.user_metadata?.username || user.email?.split('@')[0] || 'User'
      userNameEl.textContent = displayName
    }

    const dropdown = buildDropdown(user)

    if (userNameEl) {
      userNameEl.addEventListener('click', (e) => {
        e.preventDefault()
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'
      })
    }

    document.addEventListener('click', (e) => {
      if (dropdown.style.display === 'block' && !dropdown.contains(e.target) && e.target !== userNameEl && !userNameEl?.contains(e.target)) {
        dropdown.style.display = 'none'
      }
    })
  } else {
    signedOutLinks.forEach(el => el.style.display = '')
    signedInLinks.forEach(el => el.style.display = 'none')
  }
}

async function initAuth() {
  const session = await getSession()
  const user = session?.user || null
  updateNavForUser(user)

  onAuthChange((event, session) => {
    const u = session?.user || null
    updateNavForUser(u)
  })

  const style = document.createElement('style')
  style.textContent = '.nav-signed-in{white-space:nowrap;overflow:visible;width:auto !important;height:auto !important;flex-shrink:0;display:flex;align-items:center}.nav-signed-out{white-space:nowrap}.framer-f1rxyg,.framer-1psrh43,.framer-1mu359g,.framer-yxpboc{white-space:nowrap}'
  document.head.appendChild(style)

  const url = window.location.pathname
  if (url.includes('/login.html') || url.includes('/en/login.html')) {
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { data: factors } = await sb.auth.mfa.listFactors()
      if (factors?.all?.length > 0) {
        window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website/login/2fa.html'
        return
      }
    }

    const form = document.getElementById('login-form')
    if (form) {
      const originalHandler = form._submitHandler
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = document.getElementById('email').value.trim()
        const password = document.getElementById('password').value
        const btn = document.getElementById('login-btn')
        const errorEl = document.getElementById('error-msg')

        try {
          btn.disabled = true
          btn.textContent = 'Logging in...'
          const data = await signIn(email, password)
          const { data: factors } = await sb.auth.mfa.listFactors()
          if (factors?.all?.length > 0) {
            window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website/login/2fa.html'
          } else {
            const base = window.location.pathname.includes('/en/') ? '/en/index.html' : '/index.html'
            window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website' + base
          }
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = err.message
            errorEl.style.display = 'block'
          }
          btn.disabled = false
          btn.textContent = 'Log In'
        }
      })
    }
  }
}

document.addEventListener('DOMContentLoaded', initAuth)
