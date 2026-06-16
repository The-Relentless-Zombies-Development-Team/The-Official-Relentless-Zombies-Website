document.addEventListener('DOMContentLoaded', async () => {
  const errorEl = document.getElementById('error-msg')
  const successEl = document.getElementById('success-msg')

  function showError(msg) {
    errorEl.textContent = msg; errorEl.style.display = 'block'; successEl.style.display = 'none'
  }
  function showSuccess(msg) {
    successEl.textContent = msg; successEl.style.display = 'block'; errorEl.style.display = 'none'
  }
  function hideMessages() {
    errorEl.style.display = 'none'; successEl.style.display = 'none'
  }

  const session = await getSession()
  if (!session) {
    window.location.href = window.location.origin + '/The-Official-Relentless-Zombies-Website/login.html'
    return
  }

  const user = session.user
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User'
  const isEnPath = window.location.pathname.includes('/en/')

  document.getElementById('current-username').textContent = username
  document.getElementById('current-email').value = user.email || ''

  // Sidebar tabs
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
      item.classList.add('active')
      document.getElementById('tab-' + item.dataset.tab).classList.add('active')
    })
  })

  // Username change cooldown check
  const lastChange = user.user_metadata?.last_username_change_at
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000
  if (lastChange) {
    const cooldownEnd = new Date(new Date(lastChange).getTime() + TWO_WEEKS)
    if (Date.now() < cooldownEnd.getTime()) {
      document.getElementById('username-cooldown-info').style.display = 'block'
      document.getElementById('cooldown-date').textContent = cooldownEnd.toLocaleDateString()
      document.getElementById('change-username-btn').disabled = true
      document.getElementById('change-username-btn').style.opacity = '0.4'
    }
  }

  // Toggle username change form
  document.getElementById('change-username-btn')?.addEventListener('click', () => {
    document.getElementById('username-change-form').style.display = 'block'
    // Check if MFA is enrolled
    sb.auth.mfa.listFactors().then(({ data, error }) => {
      if (!error && data?.all?.length > 0) {
        document.getElementById('mfa-username-section').style.display = 'block'
      }
    })
  })

  document.getElementById('cancel-username-change')?.addEventListener('click', () => {
    document.getElementById('username-change-form').style.display = 'none'
  })

  // Send username change confirmation email
  document.getElementById('send-username-change-btn')?.addEventListener('click', async () => {
    hideMessages()
    const newUsername = document.getElementById('new-username').value.trim()

    if (!newUsername || newUsername.length > 16 || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      showError('Username must be 1-16 characters (letters, numbers, underscores).')
      return
    }

    if (newUsername === username) {
      showError('New username must be different from your current username.')
      return
    }

    // If MFA enrolled, verify password + MFA code first
    const { data: factors } = await sb.auth.mfa.listFactors()
    if (factors?.all?.length > 0) {
      const password = document.getElementById('username-password').value
      const code = document.getElementById('username-mfa-code').value

      if (!password || !code) {
        showError('Please enter your password and authenticator code.')
        return
      }

      // Verify password by trying to sign in
      try {
        await signIn(user.email, password)
      } catch {
        showError('Incorrect password.')
        return
      }

      // Verify MFA code
      const mfaFactors = await sb.auth.mfa.listFactors()
      const totpFactor = mfaFactors.data?.totp?.[0]
      if (totpFactor) {
        const { error: mfaError } = await sb.auth.mfa.challengeAndVerify({
          factorId: totpFactor.id,
          code,
        })
        if (mfaError) {
          showError('Invalid authenticator code.')
          return
        }
      }
    }

    // Call the Edge Function to send confirmation email
    const token = (await getSession()).access_token
    try {
      const res = await fetch(
        'https://prvydgkzymdtacisxfzz.supabase.co/functions/v1/send-username-change',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newUsername }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showSuccess('Confirmation email sent! Check your inbox.')
      document.getElementById('username-change-form').style.display = 'none'
    } catch (err) {
      showError(err.message)
    }
  })

  // Password change
  const pwReqs = {
    length: { el: document.getElementById('req-length'), test: v => v.length >= 8 },
    lower: { el: document.getElementById('req-lower'), test: v => /[a-z]/.test(v) },
    upper: { el: document.getElementById('req-upper'), test: v => /[A-Z]/.test(v) },
    number: { el: document.getElementById('req-number'), test: v => /[0-9]/.test(v) },
    special: { el: document.getElementById('req-special'), test: v => /[^a-zA-Z0-9]/.test(v) },
  }

  const newPwInput = document.getElementById('new-password')
  newPwInput?.addEventListener('input', () => {
    const val = newPwInput.value
    let allMet = true
    for (const key in pwReqs) {
      const r = pwReqs[key]
      const met = r.test(val)
      r.el.className = met ? 'met' : (val.length > 0 ? 'fail' : '')
      if (!met) allMet = false
    }
    newPwInput.className = val.length === 0 ? '' : allMet ? 'valid' : 'error'
  })

  document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideMessages()

    const currentPassword = document.getElementById('current-password').value
    const newPassword = newPwInput.value

    if (!currentPassword) {
      showError('Please enter your current password.')
      return
    }

    let allMet = true
    for (const key in pwReqs) {
      if (!pwReqs[key].test(newPassword)) { allMet = false; break }
    }
    if (!allMet) {
      showError('New password does not meet security requirements.')
      return
    }

    const btn = document.getElementById('change-password-btn')
    btn.disabled = true
    btn.textContent = 'Updating...'

    try {
      const { error } = await sb.auth.updateUser({ password: newPassword })
      if (error) throw error
      showSuccess('Password updated successfully!')
      document.getElementById('change-password-form').reset()
    } catch (err) {
      showError(err.message)
    }
    btn.disabled = false
    btn.textContent = 'Update Password'
  })

  // MFA management
  async function loadMFAStatus() {
    const container = document.getElementById('mfa-status-container')
    const setupBtn = document.getElementById('setup-mfa-btn')
    const disableBtn = document.getElementById('disable-mfa-btn')

    const { data, error } = await sb.auth.mfa.listFactors()
    if (error) return

    // Clear any stale setup HTML
    const setupContainer = document.getElementById('mfa-setup-container')
    setupContainer.classList.remove('active')
    setupContainer.innerHTML = ''

    const enrolled = data?.totp?.length > 0

    if (enrolled) {
      container.innerHTML = '<div class="mfa-status enrolled">Two-factor authentication is enabled</div>'
      setupBtn.style.display = 'none'
      disableBtn.style.display = ''
    } else {
      container.innerHTML = '<div class="mfa-status not-enrolled">Two-factor authentication is not enabled</div>'
      setupBtn.style.display = ''
      disableBtn.style.display = 'none'
    }
  }

  await loadMFAStatus()

  // Refresh MFA status when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadMFAStatus()
  })

  // Setup MFA (TOTP)
  document.getElementById('setup-mfa-btn')?.addEventListener('click', async () => {
    hideMessages()
    const setupContainer = document.getElementById('mfa-setup-container')
    setupContainer.classList.add('active')

    try {
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error

      const factorId = data.id
      const qrCode = data.totp?.qr_code
      const secret = data.totp?.secret

      let qrHtml = ''
      if (qrCode) {
        qrHtml = `<img src="${qrCode}" alt="QR Code" width="200" height="200">`
      } else if (secret) {
        qrHtml = `<p style="color:#888;font-size:13px;word-break:break-all;font-family:monospace">Manual setup key: ${secret}</p>`
      }

      setupContainer.innerHTML = `
        <div class="mfa-qr">
          <p style="color:#888;font-size:13px;margin-bottom:12px">Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy)</p>
          ${qrHtml}
        </div>
        <div class="form-group">
          <label for="mfa-verify-code">Enter the 6-digit code from your authenticator app</label>
          <input id="mfa-verify-code" type="text" placeholder="000000" maxlength="6" style="text-align:center;font-size:20px;letter-spacing:4px;font-family:monospace">
        </div>
        <button class="auth-btn green" id="verify-mfa-btn">Verify & Enable</button>
        <button class="auth-btn outline" id="cancel-mfa-setup" style="margin-left:8px">Cancel</button>
      `

      document.getElementById('verify-mfa-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('mfa-verify-code').value.trim()
        if (!code || code.length !== 6) {
          showError('Please enter a valid 6-digit code.')
          return
        }

        const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({
          factorId,
          code,
        })

        if (verifyError) {
          showError('Invalid code. Please try again.')
          return
        }

        showSuccess('Two-factor authentication enabled!')
        setupContainer.classList.remove('active')
        await loadMFAStatus()
      })

      document.getElementById('cancel-mfa-setup')?.addEventListener('click', () => {
        setupContainer.classList.remove('active')
        setupContainer.innerHTML = ''
      })
    } catch (err) {
      showError(err.message)
    }
  })

  // Disable MFA
  document.getElementById('disable-mfa-btn')?.addEventListener('click', async () => {
    hideMessages()
    const { data } = await sb.auth.mfa.listFactors()
    const totpFactor = data?.totp?.[0]
    const anyFactor = data?.all?.[0]

    if (!totpFactor && !anyFactor) {
      showError('No MFA factor found.')
      return
    }

    if (!confirm('Are you sure you want to disable two-factor authentication?')) return

    const factorId = totpFactor?.id || anyFactor?.id
    const { error } = await sb.auth.mfa.unenroll({ factorId })
    if (error) {
      showError(error.message)
      return
    }

    showSuccess('Two-factor authentication disabled.')
    await loadMFAStatus()
  })
})
