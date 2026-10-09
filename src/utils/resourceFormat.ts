import type { Branch, Resource, Subject } from '../types'

export function getFileTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('word')) return 'Word document'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('text/')) return 'Text file'
  return 'File'
}

type ResourceRow = Omit<Resource, 'subject'> & {
  subject?: (Omit<Subject, 'branch'> & { branch?: Branch | Branch[] | null }) | (Omit<Subject, 'branch'> & { branch?: Branch | Branch[] | null })[] | null
}

export function normalizeResource(value: unknown): Resource {
  const row = value as ResourceRow
  const relatedSubject = Array.isArray(row.subject) ? row.subject[0] : row.subject
  if (!relatedSubject) return { ...row, subject: undefined }
  const branch = Array.isArray(relatedSubject.branch) ? relatedSubject.branch[0] : relatedSubject.branch
  return { ...row, subject: { ...relatedSubject, branch: branch ?? undefined } }
}

export function normalizeResources(values: unknown[] | null): Resource[] {
  return (values ?? []).map(normalizeResource)
}
