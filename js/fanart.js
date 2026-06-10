async function loadGallery() {
  const container = document.getElementById('gallery-grid')
  if (!container) return

  container.innerHTML = '<div class="gallery-loading">Loading fan art...</div>'

  const { data: images, error } = await sb
    .from('fanart')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    container.innerHTML = '<div class="gallery-error">Failed to load fan art.</div>'
    console.error(error)
    return
  }

  if (!images || images.length === 0) {
    container.innerHTML = '<div class="gallery-empty">No fan art yet. Be the first to share!</div>'
    return
  }

  container.innerHTML = ''
  for (const img of images) {
    const card = document.createElement('div')
    card.className = 'fanart-card'

    const publicUrl = sb.storage.from('fanart-images').getPublicUrl(img.image_url).data.publicUrl

    card.innerHTML = `
      <img src="${publicUrl}" alt="${img.title || 'Fan art'}" loading="lazy" class="fanart-image"
        onclick="openModal('${publicUrl}', '${img.title?.replace(/'/g, "\\'") || ''}')">
      <div class="fanart-info">
        <span class="fanart-title">${img.title || 'Untitled'}</span>
      </div>
    `
    container.appendChild(card)
  }
}

async function uploadFanArt(file, title) {
  const session = await getSession()
  if (!session) throw new Error('You must be signed in to upload.')

  const ext = file.name.split('.').pop()
  const filePath = `${session.user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from('fanart-images')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { error: dbError } = await sb
    .from('fanart')
    .insert({
      user_id: session.user.id,
      image_url: filePath,
      title: title
    })

  if (dbError) throw dbError
}

function openModal(url, title) {
  const modal = document.getElementById('image-modal')
  const img = document.getElementById('modal-image')
  const caption = document.getElementById('modal-caption')
  if (!modal || !img) return
  img.src = url
  if (caption) caption.textContent = title
  modal.style.display = 'flex'
}

function closeModal() {
  const modal = document.getElementById('image-modal')
  if (modal) modal.style.display = 'none'
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadGallery()

  const session = await getSession()
  const uploadSection = document.getElementById('upload-section')
  const uploadForm = document.getElementById('upload-form')
  const uploadBtn = document.getElementById('upload-btn')
  const cancelUploadBtn = document.getElementById('cancel-upload')

  if (session && uploadSection) {
    uploadSection.style.display = 'block'
  }

  if (uploadBtn && uploadForm) {
    uploadBtn.addEventListener('click', () => {
      uploadForm.style.display = 'flex'
      uploadBtn.style.display = 'none'
    })
  }

  if (cancelUploadBtn && uploadForm) {
    cancelUploadBtn.addEventListener('click', () => {
      uploadForm.style.display = 'none'
      if (uploadBtn) uploadBtn.style.display = 'flex'
    })
  }

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fileInput = document.getElementById('file-input')
      const titleInput = document.getElementById('art-title')
      const status = document.getElementById('upload-status')

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (status) status.textContent = 'Please select an image.'
        return
      }

      if (status) status.textContent = 'Uploading...'
      const submitBtn = uploadForm.querySelector('button[type="submit"]')
      if (submitBtn) submitBtn.disabled = true

      try {
        await uploadFanArt(fileInput.files[0], titleInput?.value || '')
        if (status) status.textContent = 'Upload complete!'
        if (titleInput) titleInput.value = ''
        if (fileInput) fileInput.value = ''
        if (submitBtn) submitBtn.disabled = false
        uploadForm.style.display = 'none'
        if (uploadBtn) uploadBtn.style.display = 'flex'
        await loadGallery()
      } catch (err) {
        if (status) status.textContent = 'Error: ' + err.message
        if (submitBtn) submitBtn.disabled = false
      }
    })
  }

  const modal = document.getElementById('image-modal')
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal()
  })
})
