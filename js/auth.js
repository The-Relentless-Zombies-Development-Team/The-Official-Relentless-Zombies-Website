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

function updateNavForUser(user) {
  const signedOutLinks = document.querySelectorAll('.nav-signed-out')
  const signedInLinks = document.querySelectorAll('.nav-signed-in')
  const userNameEl = document.getElementById('nav-user-name')

  if (user) {
    signedOutLinks.forEach(el => el.style.display = 'none')
    signedInLinks.forEach(el => el.style.display = '')
    if (userNameEl) {
      userNameEl.textContent = user.user_metadata?.username || user.email?.split('@')[0] || 'User'
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

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      await signOut()
      window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website/index.html'
    })
  }
}

document.addEventListener('DOMContentLoaded', initAuth)
