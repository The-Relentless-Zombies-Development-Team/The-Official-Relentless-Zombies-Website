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
    window.location.href = window.location.origin + siteRoot() + '/login.html'
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
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
  if (lastChange) {
    const cooldownEnd = new Date(new Date(lastChange).getTime() + ONE_WEEK)
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
      if (!error && data?.totp?.length > 0) {
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
    if (factors?.totp?.length > 0) {
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
        'https://qyoortkrlfxzuzjxwfge.supabase.co/functions/v1/send-username-change',
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

  // Refresh MFA status on every normal reload and when tab becomes visible/focused
  // Covers: visibilitychange (tab switch), pageshow (bfcache), focus (window refocus), load (hard reload)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadMFAStatus()
  })
  window.addEventListener('pageshow', () => loadMFAStatus())
  window.addEventListener('focus', () => loadMFAStatus())
  window.addEventListener('load', () => loadMFAStatus())
  // Also refresh when Security tab is clicked (user expects status to be current)
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    if (item.dataset.tab === 'security') {
      item.addEventListener('click', () => setTimeout(loadMFAStatus, 50))
    }
  })
  // Fallback: also check on hash change or after a short delay (handles SPA-like nav)
  setTimeout(loadMFAStatus, 1500)

  // Setup MFA (TOTP)
  document.getElementById('setup-mfa-btn')?.addEventListener('click', async () => {
    hideMessages()
    const setupContainer = document.getElementById('mfa-setup-container')
    setupContainer.classList.add('active')
    setupContainer.innerHTML = '<p style="color:#888;font-size:13px;">Setting up...</p>'

    try {
      // Cleanup any unverified TOTP factors before enrolling (prevents "factor already exists")
      const { data: existing } = await sb.auth.mfa.listFactors()
      const unverified = existing?.all?.find((f) => f.factor_type === 'totp' && f.status === 'unverified')
      if (unverified) {
        await sb.auth.mfa.unenroll({ factorId: unverified.id })
      }

      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' })
      if (error) throw error

      const factorId = data.id
      const totp = data.totp || {}
      const qrCode = totp.qr_code
      const secret = totp.secret
      const uri = totp.uri

      // --- Robust QR handling: prefer uri via api.qrserver, avoid raw data: with quotes breaking HTML ---
      function escapeAttr(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') }
      let qrHtml = ''
      const otpUri = uri || qrCode || ''
      console.log('[2FA] enroll response:', { factorId, qrCode, uri, secret, otpUri })
      // Determine safe QR source
      let qrUrl = ''
      let useQrImg = false
      if (uri && uri.startsWith('otpauth://')) {
        // Most reliable: generate QR from otpauth URI via external service (no quoting issues, encodeURIComponent handles it)
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
        useQrImg = true
      } else if (otpUri && otpUri.startsWith('data:image/') && otpUri.includes(';base64,')) {
        // Safe base64 data URI (no raw quotes) — can be used directly
        // Verify it does not contain unescaped double quotes that would break src=""
        if (!otpUri.includes('"')) {
          qrUrl = otpUri
          useQrImg = true
        } else {
          // Fallback to uri if available, else secret
          if (uri) {
            qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
            useQrImg = true
          }
        }
      } else if (otpUri && otpUri.startsWith('otpauth://')) {
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpUri)}`
        useQrImg = true
      }
      if (useQrImg && qrUrl) {
        const safeUrl = escapeAttr(qrUrl)
        // onerror fallback to show manual key/uri if external QR service is blocked (CSP, offline, etc)
        qrHtml = `<img src="${safeUrl}" alt="QR Code" width="200" height="200" style="display:block;margin:0 auto;border-radius:8px;background:#fff;padding:8px" onerror="this.style.display='none';document.getElementById('qr-fallback-'+factorId)?.style && (document.getElementById('qr-fallback-'+factorId).style.display='block')">`
        qrHtml += `<div id="qr-fallback-${factorId}" style="display:none;color:#888;font-size:12px;word-break:break-all;margin-top:12px">QR failed to load — enter key manually:<br><code style="color:#fff;font-family:monospace;word-break:break-all">${escapeAttr(secret || otpUri || '')}</code><br><span style="font-size:11px;color:#666">URI: ${escapeAttr(otpUri)}</span></div>`
        if (secret) qrHtml += `<p style="color:#666;font-size:11px;word-break:break-all;font-family:monospace;margin-top:12px">Key: ${escapeAttr(secret)}</p>`
        if (otpUri && otpUri.startsWith('otpauth://')) {
          qrHtml += `<p style="color:#666;font-size:10px;word-break:break-all;margin-top:8px">If QR doesn't scan, copy this URI into your authenticator app's manual entry:</p><p style="color:#888;font-size:10px;word-break:break-all;font-family:monospace;background:#222;padding:8px;border-radius:6px">${escapeAttr(otpUri)}</p>`
        }
      } else if (secret) {
        qrHtml = `<p style="color:#888;font-size:13px;word-break:break-all;font-family:monospace">Manual setup key: ${escapeAttr(secret)}</p><p style="color:#666;font-size:11px;margin-top:8px">Enter this key in your authenticator app if you can't scan the QR.</p>`
        if (otpUri) qrHtml += `<p style="color:#666;font-size:10px;word-break:break-all;margin-top:8px;font-family:monospace">URI: ${escapeAttr(otpUri)}</p>`
      } else if (otpUri) {
        // Last resort: show the URI as text so user can copy it (even if we couldn't make QR)
        qrHtml = `<p style="color:#888;font-size:13px;word-break:break-all">Scan failed — copy this URI into your app:</p><p style="color:#fff;font-size:11px;word-break:break-all;font-family:monospace;background:#222;padding:12px;border-radius:8px">${escapeAttr(otpUri)}</p>`
      } else {
        qrHtml = `<p style="color:#f66">Unable to generate QR code. Secret and URI missing — please try again or contact support.</p><p style="color:#888;font-size:11px">Check console for enroll response details.</p>`
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

        // Try challengeAndVerify first, fallback to challenge+verify
        let verifyError = null
        try {
          const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code })
          verifyError = error
        } catch (e) {
          verifyError = e
        }
        if (verifyError) {
          // Fallback: explicit challenge then verify
          try {
            const { data: challengeData, error: chError } = await sb.auth.mfa.challenge({ factorId })
            if (chError) throw chError
            const { error: vError } = await sb.auth.mfa.verify({ factorId, challengeId: challengeData.id, code })
            if (vError) throw vError
            verifyError = null
          } catch (e) {
            verifyError = e
          }
        }

        if (verifyError) {
          showError(verifyError.message || 'Invalid code. Please try again.')
          return
        }

        showSuccess('Two-factor authentication enabled!')
        setupContainer.classList.remove('active')
        setupContainer.innerHTML = ''
        await loadMFAStatus()
      })

      document.getElementById('cancel-mfa-setup')?.addEventListener('click', async () => {
        // Unenroll the unverified factor if user cancels
        try { await sb.auth.mfa.unenroll({ factorId }) } catch {}
        setupContainer.classList.remove('active')
        setupContainer.innerHTML = ''
      })
    } catch (err) {
      setupContainer.classList.remove('active')
      setupContainer.innerHTML = ''
      showError(err.message || 'Failed to setup 2FA. Please try again.')
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

  // Delete Account
  const deleteBtn = document.getElementById('delete-account-btn')
  const deleteForm = document.getElementById('delete-account-form')
  const cancelDeleteBtn = document.getElementById('cancel-delete-account')
  const confirmDeleteBtn = document.getElementById('confirm-delete-account-btn')
  const deleteConfirmCheckbox = document.getElementById('delete-confirm')

  deleteBtn?.addEventListener('click', () => {
    const isHidden = deleteForm.style.display === 'none'
    deleteForm.style.display = isHidden ? 'block' : 'none'
    if (isHidden) {
      deleteConfirmCheckbox.checked = false
      document.getElementById('delete-mfa-code').value = ''
    }
  })

  cancelDeleteBtn?.addEventListener('click', () => {
    deleteForm.style.display = 'none'
    deleteConfirmCheckbox.checked = false
    document.getElementById('delete-mfa-code').value = ''
  })

  confirmDeleteBtn?.addEventListener('click', async () => {
    hideMessages()
    const code = document.getElementById('delete-mfa-code').value.trim()

    if (!code || code.length !== 6) {
      showError('Please enter a valid 6-digit code.')
      return
    }

    if (!deleteConfirmCheckbox.checked) {
      showError('Please confirm you understand this will permanently delete your account.')
      return
    }

    // Verify MFA is enrolled
    const { data: factors } = await sb.auth.mfa.listFactors()
    if (!factors?.totp?.length > 0) {
      showError('Two-factor authentication is required to delete your account. Enable 2FA first.')
      return
    }

    const totpFactor = factors.data?.totp?.[0]
    if (!totpFactor) {
      showError('No MFA factor found.')
      return
    }

    confirmDeleteBtn.disabled = true
    confirmDeleteBtn.textContent = 'Deleting...'

    try {
      // Verify MFA code
      const { error: mfaError } = await sb.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code,
      })
      if (mfaError) {
        showError('Invalid authenticator code.')
        confirmDeleteBtn.disabled = false
        confirmDeleteBtn.textContent = 'Delete Account'
        return
      }

      // Call Edge Function to delete the account
      const token = (await getSession()).access_token
      const res = await fetch(
        'https://qyoortkrlfxzuzjxwfge.supabase.co/functions/v1/delete-account',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      showSuccess('Account deleted successfully.')
      setTimeout(() => {
        sb.auth.signOut()
        window.location.href = window.location.origin + siteRoot() + '/index.html'
      }, 1500)
    } catch (err) {
      showError(err.message)
      confirmDeleteBtn.disabled = false
      confirmDeleteBtn.textContent = 'Delete Account'
    }
  })
})
