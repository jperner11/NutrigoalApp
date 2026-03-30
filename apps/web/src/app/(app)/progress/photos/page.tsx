'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Plus, Camera, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProgressPhoto, PhotoPose } from '@/lib/supabase/types'

const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
]

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
      toast.success('Photo uploaded!')
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
    // Extract storage path from URL
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
  const lightboxIndex = lightbox ? photos.findIndex(p => p.id === lightbox.id) : -1
  function nextPhoto() {
    if (lightboxIndex < photos.length - 1) setLightbox(photos[lightboxIndex + 1])
  }
  function prevPhoto() {
    if (lightboxIndex > 0) setLightbox(photos[lightboxIndex - 1])
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <Link href="/progress" className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center text-gray-600 hover:text-gray-900">
          Weight
        </Link>
        <Link href="/progress/measurements" className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center text-gray-600 hover:text-gray-900">
          Measurements
        </Link>
        <Link href="/progress/photos" className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center bg-white text-purple-700 shadow-sm">
          Photos
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress Photos</h1>
          <p className="text-gray-600 mt-1">Track your visual transformation over time.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Upload Photo
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pose</label>
              <div className="flex gap-2">
                {POSES.map(pose => (
                  <button
                    key={pose.value}
                    onClick={() => setFormPose(pose.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      formPose === pose.value
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {pose.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* File picker */}
          <div className="mb-4">
            {preview ? (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-48 rounded-lg object-cover"
                />
                <button
                  onClick={() => { setSelectedFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors"
              >
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to select a photo</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
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

          <div className="mb-4">
            <label className="block text-xs text-gray-600 mb-1">Notes</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={() => { setShowForm(false); setSelectedFile(null); setPreview(null) }}
              className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Photo Grid grouped by date */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, datePhotos]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {datePhotos.map(photo => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => setLightbox(photo)}
                  >
                    <Image
                      src={photo.photo_url}
                      alt={`${photo.pose} pose`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 33vw, 250px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute bottom-2 left-2 text-xs font-medium text-white bg-black/40 px-2 py-0.5 rounded-full capitalize">
                      {photo.pose}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo) }}
                      className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
          <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-500 mb-4">Upload progress photos to track your visual transformation.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Upload First Photo
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto() }}
              className="absolute left-4 p-2 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto() }}
              className="absolute right-4 p-2 text-white/70 hover:text-white"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div className="max-w-2xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.photo_url}
              alt={`${lightbox.pose} pose`}
              className="max-h-[85vh] rounded-lg object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
              <div className="flex items-center gap-3 text-white">
                <span className="text-sm font-medium capitalize">{lightbox.pose}</span>
                <span className="text-sm text-white/70">
                  {new Date(lightbox.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {lightbox.notes && <span className="text-sm text-white/60">{lightbox.notes}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
