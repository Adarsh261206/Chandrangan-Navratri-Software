import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { IconCamera, IconCheck, IconImage, IconTrash } from './ui/Icons'
import { compressImage } from '../utils/image'
import type { CompressedImage } from '../utils/image'

interface PhotoCaptureProps {
  value: CompressedImage | null
  onChange: (value: CompressedImage | null) => void
  onError: (message: string) => void
  disabled?: boolean
}

export function PhotoCapture({ value, onChange, onError, disabled = false }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement | null>(null)
  const galleryRef = useRef<HTMLInputElement | null>(null)
  const [processing, setProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setProcessing(true)
    try {
      const compressed = await compressImage(file, 800, 0.8)
      onChange(compressed)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not process that photo.')
    } finally {
      setProcessing(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (galleryRef.current) galleryRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        aria-label="Take a photo with the camera"
        disabled={disabled || processing}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a photo from the gallery"
        disabled={disabled || processing}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {value && previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-cream-300 bg-cream-100">
          <img
            src={previewUrl}
            alt="Selected participant photo preview"
            width={value.width}
            height={value.height}
            decoding="async"
            className="mx-auto max-h-72 w-auto max-w-full object-contain"
          />
          <div className="flex items-center justify-between gap-2 border-t border-cream-200 bg-white/95 px-3 py-2">
            <p className="text-xs text-charcoal-500">
              Ready to upload · {value.width}×{value.height} WebP
            </p>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => cameraRef.current?.click()}
                disabled={processing || disabled}
                icon={<IconCamera className="h-4 w-4" />}
              >
                Retake
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange(null)}
                disabled={processing || disabled}
                icon={<IconTrash className="h-4 w-4" />}
              >
                Remove
              </Button>
            </div>
          </div>
          {processing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-maroon-200 border-t-maroon-700" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={disabled || processing}
            className="focus-ring flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-maroon-200 bg-maroon-50 px-3 text-maroon-800 transition-colors hover:bg-maroon-100 disabled:opacity-60"
          >
            {processing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-maroon-200 border-t-maroon-700" />
            ) : (
              <IconCamera className="h-6 w-6" />
            )}
            <span className="text-sm font-bold">Take Photo</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={disabled || processing}
            className="focus-ring flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-cream-300 bg-white px-3 text-charcoal-700 transition-colors hover:bg-cream-100 disabled:opacity-60"
          >
            <IconImage className="h-6 w-6" />
            <span className="text-sm font-bold">Upload Photo</span>
          </button>
        </div>
      )}

      {!value ? (
        <p className="flex items-center gap-1.5 text-xs text-charcoal-500">
          <IconCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          Photos are compressed automatically before upload — no large files.
        </p>
      ) : null}
    </div>
  )
}
