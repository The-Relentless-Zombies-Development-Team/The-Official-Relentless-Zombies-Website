const STORAGE_BUCKET = 'fanart'

async function loadGallery() {
  const grid = document.getElementById('gallery-grid')
  const loading = document.getElementById('gallery-loading')
  if (!grid) return

  if (loading) loading.style.display = 'block'
  grid.innerHTML = ''

  const { data: images, error } = await sb
    .from('fanart')
    .select('*')
    .order('created_at', { ascending: false })

  if (loading) loading.style.display = 'none'

  if (error) {
    grid.innerHTML = '<div class="gallery-empty"><h2>Failed to load</h2><p>Could not load fan art. Please try again later.</p></div>'
    console.error(error)
    return
  }

  if (!images || images.length === 0) {
    grid.innerHTML = '<div class="gallery-empty"><h2>No fan art yet</h2><p>Be the first to share!</p></div>'
    return
  }

  for (const img of images) {
    const item = document.createElement('div')
    item.className = 'gallery-item'

    const { data: { publicUrl } } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(img.image_url)
    const caption = img.caption || ''
    const author = img.username || ''

    item.innerHTML = `
      <img src="${publicUrl}" alt="${caption || 'Fan art'}" loading="lazy"
        onclick="openModal('${publicUrl.replace(/'/g, "\\'")}', '${caption.replace(/'/g, "\\'")}')">
      <div class="author">${author}</div>
      ${caption ? `<div class="caption">${caption}</div>` : ''}
    `
    grid.appendChild(item)
  }
}

async function uploadFanArt(file) {
  const session = await getSession()
  if (!session) throw new Error('You must be signed in to upload.')

  const ext = file.name.split('.').pop()
  const filePath = `${session.user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const username = session.user.user_metadata?.username || session.user.email || ''

  const { error: dbError } = await sb
    .from('fanart')
    .insert({
      user_id: session.user.id,
      image_url: filePath,
      caption: '',
      username: username,
      approved: false
    })

  if (dbError) throw dbError
}

function openModal(url, caption) {
  const overlay = document.getElementById('modal-overlay')
  const img = document.getElementById('modal-image')
  const cap = document.getElementById('modal-caption')
  if (!overlay || !img) return
  img.src = url
  if (cap) cap.textContent = caption || ''
  overlay.classList.add('open')
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay')
  if (overlay) overlay.classList.remove('open')
}

document.addEventListener('DOMContentLoaded', async () => {
  loadGallery()

  const session = await getSession()
  const uploadArea = document.getElementById('upload-area')
  const uploadBtn = document.getElementById('upload-btn')
  const uploadInput = document.getElementById('upload-input')
  const uploadStatus = document.getElementById('upload-status')

  if (session && uploadArea) {
    uploadArea.classList.add('visible')
  }

  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener('click', () => {
      uploadInput.click()
    })

    uploadInput.addEventListener('change', async () => {
      const file = uploadInput.files?.[0]
      if (!file) return

      if (uploadStatus) uploadStatus.textContent = 'Uploading...'
      uploadBtn.disabled = true

      try {
        await uploadFanArt(file)
        if (uploadStatus) uploadStatus.textContent = 'Upload complete!'
        uploadInput.value = ''
        loadGallery()
      } catch (err) {
        if (uploadStatus) uploadStatus.textContent = 'Error: ' + err.message
      } finally {
        uploadBtn.disabled = false
      }
    })
  }

  const closeBtn = document.getElementById('modal-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal)
  }

  const overlay = document.getElementById('modal-overlay')
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal()
    })
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal()
  })
})