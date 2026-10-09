import { FileImage, FileQuestion, FileSpreadsheet, FileText, Presentation } from 'lucide-react'

type FileTypeIconProps = { mimeType: string; size?: number }

export default function FileTypeIcon({ mimeType, size = 22 }: FileTypeIconProps) {
  const iconProps = { size, 'aria-hidden': true as const }
  if (mimeType === 'application/pdf') return <FileText {...iconProps} className="file-type-icon file-type-pdf" />
  if (mimeType.includes('word')) return <FileText {...iconProps} className="file-type-icon file-type-word" />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation {...iconProps} className="file-type-icon file-type-slides" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet {...iconProps} className="file-type-icon file-type-sheet" />
  if (mimeType.startsWith('image/')) return <FileImage {...iconProps} className="file-type-icon file-type-image" />
  if (mimeType.startsWith('text/')) return <FileText {...iconProps} className="file-type-icon file-type-text" />
  return <FileQuestion {...iconProps} className="file-type-icon" />
}
