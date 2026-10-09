import { supabase } from '../lib/supabase'
import { getSafeResourceFile, MAX_RESOURCE_FILE_SIZE } from './resourceFileUtils'

export const RESOURCE_BUCKET = 'academic-resources'
export { getSafeResourceFile, MAX_RESOURCE_FILE_SIZE }

export async function uploadResourceFile(
  file: File,
  path: string,
  onProgress: (percentage: number) => void,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { mimeType } = getSafeResourceFile(file)
  const [{ data: sessionData, error: sessionError }] = await Promise.all([supabase.auth.getSession()])
  if (sessionError) throw new Error('Unable to start the upload. Please sign in again.')
  const token = sessionData.session?.access_token
  const projectUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!token || !projectUrl || !anonKey) throw new Error('Sign in and configure Supabase before uploading.')

  const { Upload: TusUpload } = await import('tus-js-client')
  await new Promise<void>((resolve, reject) => {
    const upload = new TusUpload(file, {
      endpoint: `${projectUrl}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${token}`, apikey: anonKey },
      metadata: {
        bucketName: RESOURCE_BUCKET,
        objectName: path,
        contentType: mimeType,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      uploadSize: file.size,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,
      onProgress(bytesUploaded, bytesTotal) {
        onProgress(Math.round((bytesUploaded / bytesTotal) * 100))
      },
      onError() {
        reject(new Error('Upload failed. Check your connection and try again.'))
      },
      onSuccess() {
        onProgress(100)
        resolve()
      },
    })
    upload.start()
  })
}

export async function getResourceFileUrl(resourceId: string, download = false): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .select('file_path, file_name, status')
    .eq('id', resourceId)
    .maybeSingle()
  if (resourceError || !resource) throw new Error('This resource is unavailable or you do not have access.')
  if (download && resource.status !== 'published') throw new Error('This resource is not available for download.')

  const { data, error } = await supabase.storage
    .from(RESOURCE_BUCKET)
    .createSignedUrl(resource.file_path, 90, { download: download ? resource.file_name : false })
  if (error || !data?.signedUrl) throw new Error('The resource file could not be opened. Please try again later.')
  if (download) {
    const { error: countError } = await supabase.rpc('record_resource_download', { target_resource_id: resourceId })
    if (countError) throw new Error('Unable to prepare this download. Please try again.')
  }
  return data.signedUrl
}
