export const MAX_RESOURCE_FILE_SIZE = 25 * 1024 * 1024

const allowedTypes: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export function getSafeResourceFile(file: File): { name: string; mimeType: string } {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = allowedTypes[extension]
  if (!mimeType || (file.type && file.type !== mimeType)) {
    throw new Error('Unsupported file type. Choose PDF, Office document, text, PNG, JPG, or WebP.')
  }
  if (file.size > MAX_RESOURCE_FILE_SIZE) throw new Error('File too large. Maximum size is 25 MB.')
  if (file.size === 0) throw new Error('The selected file is empty.')

  const baseName = file.name.slice(0, file.name.length - extension.length - 1)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100) || 'resource'

  return { name: `${baseName}.${extension}`, mimeType }
}
