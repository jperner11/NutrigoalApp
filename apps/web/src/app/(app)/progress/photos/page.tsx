'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Plus, Camera, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProgressPhoto, PhotoPose } from '@/lib/supabase/types'
import AppPageHeader from '@/components/ui/AppPageHeader'

const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--ink-2)',
  border: '1px solid var(--line-2)',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--fg)',
  outline: 'none',
}

export default function PhotosPage() {
  const { profile } = useUser()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formPose, setFormPose] = useState<PhotoPose>('front')
  const [formNotes, setFormNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPhotos = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(50)

    setPhotos(data ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)')
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleUpload() {
    if (!profile || !selectedFile) return
    setUploading(true)
    const supabase = createClient()

    const ext = selectedFile.name.split('.').pop()
    const path = `${profile.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, selectedFile, { upsert: false })

    if (uploadError) {
      toast.error('Failed to upload photo')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('progress-photos').getPublicUrl(path)

    const { error } = await supabase.from('progress_photos').insert({
      user_id: profile.id,
      date: formDate,
      photo_url: urlData.publicUrl,
      pose: formPose,
      notes: formNotes || null,
    })

    if (error) {
      toast.error('Failed to save photo record')
    } else {
      toast.success('Photo uploaded.')
      setShowForm(false)
      setSelectedFile(null)
      setPreview(null)
      setFormNotes('')
      loadPhotos()
    }
    setUploading(false)
  }

  async function handleDelete(photo: ProgressPhoto) {
    if (!window.confirm('Delete this photo? This action cannot be undone.')) return
    const supabase = createClient()
    const urlParts = photo.photo_url.split('/progress-photos/')
    const storagePath = urlParts[1]
    if (storagePath) {
      await supabase.storage.from('progress-photos').remove([storagePath])
    }
    const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id)
    if (error) {
      toast.error('Failed to delete photo')
      return
    }
    toast.success('Photo deleted')
    if (lightbox?.id === photo.id) setLightbox(null)
    loadPhotos()
  }

  // Group photos by date
  const grouped = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    if (!acc[p.date]) acc[p.date] = []
    acc[p.date].push(p)
    return acc
  }, {})

  // Lightbox navigation
  const lightboxIndex = lightbox ? photos.findIndex((p) => p.id === lightbox.id) : -1
  function nextPhoto() {
    if (lightboxIndex < photos.length - 1) setLightbox(photos[lightboxIndex + 1])
  }
  function prevPhoto() {
    if (lightboxIndex > 0) setLightbox(photos[lightboxIndex - 1])
  }

  if (loading) {
    return (
      <div className="card p-8">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Pulling your progress photos.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[920px]">
      {/* Sub-tab nav */}
      <div className="tab-row mb-6">
        <Link href="/progress" className="tab">
          WEIGHT
        </Link>
        <Link href="/progress/measurements" className="tab">
          MEASUREMENTS
        </Link>
        <Link href="/progress/photos" className="tab active">
          PHOTOS
        </Link>
      </div>

      <AppPageHeader
        eyebrow="Progress"
        title="Progress"
        accent="photos."
        subtitle="Track your visual transformation over time."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-accent"
          >
            <Plus className="h-4 w-4" />
            Upload photo
          </button>
        }
      />

      {/* Upload Form */}
      {showForm && (
        <div className="card mb-6 p-6">
          <div
            className="mono mb-4"
            style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
          >
            UPLOAD PHOTO
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mono mb-2 block"
                style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
              >
                DATE
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="mono mb-2 block"
                style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
              >
                POSE
              </label>
              <div className="row gap-2">
                {POSES.map((pose) => {
                  const active = formPose === pose.value
                  return (
                    <button
                      key={pose.value}
                      onClick={() => setFormPose(pose.value)}
                      className="flex-1 transition"
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        background: active ? 'var(--ink-3)' : 'var(--ink-2)',
                        border: active
                          ? '1px solid var(--acc)'
                          : '1px solid var(--line-2)',
                        color: active ? 'var(--fg)' : 'var(--fg-2)',
                        cursor: 'pointer',
                      }}
                    >
                      {pose.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* File picker */}
          <div className="mt-4">
            {preview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="h-48 rounded-xl object-cover"
                  style={{ border: '1px solid var(--line-2)' }}
                />
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreview(null)
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(13, 27, 42, 0.6)',
                    color: '#fff',
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full transition"
                style={{
                  padding: '32px 24px',
                  border: '2px dashed var(--line-2)',
                  borderRadius: 14,
                  background: 'var(--ink-2)',
                  textAlign: 'center',
                }}
              >
                <Camera
                  className="mx-auto mb-2 h-8 w-8"
                  style={{ color: 'var(--fg-4)' }}
                />
                <div
                  style={{ fontSize: 14, color: 'var(--fg-2)' }}
                >
                  Click to select a photo
                </div>
                <div
                  className="mono mt-1"
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-4)',
                    letterSpacing: '0.08em',
                  }}
                >
                  JPG, PNG · UP TO 10MB
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="mt-4">
            <label
              className="mono mb-2 block"
              style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
            >
              NOTES
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional notes"
              style={inputStyle}
            />
          </div>

          <div className="row mt-5 gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="btn btn-accent disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setSelectedFile(null)
                setPreview(null)
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Photo Grid grouped by date */}
      {Object.keys(grouped).length > 0 ? (
        <div className="col gap-7">
          {Object.entries(grouped).map(([date, datePhotos]) => (
            <div key={date}>
              <div
                className="mono mb-3"
                style={{
                  fontSize: 11,
                  color: 'var(--fg-3)',
                  letterSpacing: '0.14em',
                }}
              >
                {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {datePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl"
                    style={{
                      background: 'var(--ink-3)',
                      border: '1px solid var(--line)',
                    }}
                    onClick={() => setLightbox(photo)}
                  >
                    <Image
                      src={photo.photo_url}
                      alt={`${photo.pose} pose`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 280px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,27,42,0.55)] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span
                      className="chip absolute bottom-2 left-2"
                      style={{
                        background: 'rgba(13, 27, 42, 0.55)',
                        borderColor: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        textTransform: 'uppercase',
                      }}
                    >
                      {photo.pose}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(photo)
                      }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100"
                      style={{
                        background: 'rgba(13, 27, 42, 0.55)',
                        color: '#fff',
                      }}
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="card p-12 text-center">
          <Camera
            className="mx-auto mb-3 h-10 w-10"
            style={{ color: 'var(--fg-4)' }}
          />
          <div className="serif" style={{ fontSize: 22 }}>
            No photos{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              yet.
            </span>
          </div>
          <p
            className="mx-auto mt-2 max-w-[420px]"
            style={{ fontSize: 13, color: 'var(--fg-2)' }}
          >
            Upload progress photos to track your visual transformation.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-accent mt-5"
          >
            <Plus className="h-4 w-4" />
            Upload first photo
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(13, 27, 42, 0.92)', backdropFilter: 'blur(6px)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 p-2 transition"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevPhoto()
              }}
              className="absolute left-4 p-2 transition"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextPhoto()
              }}
              className="absolute right-4 p-2 transition"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              aria-label="Next photo"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div
            className="relative max-h-[85vh] max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.photo_url}
              alt={`${lightbox.pose} pose`}
              className="max-h-[85vh] rounded-xl object-contain"
            />
            <div
              className="absolute bottom-0 left-0 right-0 rounded-b-xl p-4"
              style={{
                background:
                  'linear-gradient(to top, rgba(13, 27, 42, 0.85), transparent)',
              }}
            >
              <div className="row gap-3" style={{ color: '#fff' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--acc)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {lightbox.pose}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {new Date(lightbox.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </span>
                {lightbox.notes && (
                  <span
                    style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}
                  >
                    · {lightbox.notes}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
