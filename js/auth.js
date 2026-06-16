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

async function signOut(e) {
  if (e) e.preventDefault()
  const { error } = await sb.auth.signOut()
  if (error) throw error
  window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website/index.html'
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

function updateNavForUser(user) {
  const signedOutLinks = document.querySelectorAll('.nav-signed-out')
  const signedInLinks = document.querySelectorAll('.nav-signed-in')
  const userNameEl = document.getElementById('nav-user-name')

  if (user) {
    signedOutLinks.forEach(el => el.style.display = 'none')
    signedInLinks.forEach(el => el.style.display = '')
    if (userNameEl) {
      const displayName = user.user_metadata?.username || user.email?.split('@')[0] || 'User'
      userNameEl.textContent = displayName
    }
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
  style.textContent = '.nav-signed-in{white-space:nowrap;overflow:visible;width:auto !important;height:auto !important;flex-shrink:0;display:flex;align-items:center}.nav-signed-out{white-space:nowrap}[data-framer-root] nav{position:fixed !important;top:0 !important;left:50% !important;transform:translateX(-50%) !important;z-index:1000 !important}[data-framer-root]{padding-top:64px !important}.nav-signout-sm a{font-size:25px !important;font-weight:800 !important;line-height:2em !important}'
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
