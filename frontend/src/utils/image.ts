const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SOURCE_BYTES = 15 * 1024 * 1024

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  filename: string
}

/**
 * Validates, downscales and re-encodes a photo in the browser before upload.
 * Keeps uploads small on slow networks; the server re-validates and stores WebP.
 */
export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.82
): Promise<CompressedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG or WebP images are allowed.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That photo is too large. Please choose a smaller image.')
  }

  const { width, height } = await decodeSize(file)
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const bitmap = await drawToCanvas(file, targetWidth, targetHeight)
  const blob = await canvasToBlob(bitmap.canvas, quality)

  bitmap.canvas.width = 0
  bitmap.canvas.height = 0

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    filename: `${safeName || 'photo'}.${extension}`,
  }
}

async function decodeSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('That file does not look like a valid image.'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function drawToCanvas(
  file: File,
  width: number,
  height: number
): Promise<{ canvas: HTMLCanvasElement }> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Photo processing is not supported on this device.')
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    return { canvas }
  }

  const url = URL.createObjectURL(file)
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height)
        resolve()
      }
      image.onerror = () => reject(new Error('That file does not look like a valid image.'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
  return { canvas }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fallback = () => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Could not process the photo. Please try again.'))
        },
        'image/jpeg',
        quality
      )
    }

    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === 'image/webp') resolve(blob)
          else fallback()
        },
        'image/webp',
        quality
      )
    } catch {
      fallback()
    }
  })
}
