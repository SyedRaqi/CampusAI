import { useRef } from 'react'
import { FileUp, X } from 'lucide-react'
import { getSafeResourceFile, MAX_RESOURCE_FILE_SIZE } from '../../services/storageService'
import UploadProgress from './UploadProgress'

type ResourceUploaderProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  onError: (message: string) => void
  progress?: number | null
  disabled?: boolean
}

export default function ResourceUploader({ file, onFileChange, onError, progress = null, disabled = false }: ResourceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp'

  const chooseFile = (selected?: File) => {
    if (!selected) return
    try {
      getSafeResourceFile(selected)
      onError('')
      onFileChange(selected)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unsupported file.')
      onFileChange(null)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!disabled) chooseFile(event.dataTransfer.files[0])
  }

  return (
    <div>
      <div className="resource-dropzone" role="button" tabIndex={disabled ? -1 : 0} aria-label="Choose a resource file" onClick={() => !disabled && inputRef.current?.click()} onKeyDown={(event) => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); inputRef.current?.click() } }} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <FileUp size={26} aria-hidden="true" />
        <strong>Drag a file here or browse</strong>
        <span>PDF, Office documents, TXT, PNG, JPG or WebP · maximum 25 MB</span>
        <input ref={inputRef} type="file" accept={accept} disabled={disabled} hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
      </div>
      {file && <div className="resource-selected-file"><span>{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</span><button type="button" aria-label="Remove selected file" disabled={disabled} onClick={() => { onFileChange(null); if (inputRef.current) inputRef.current.value = '' }}><X size={17} /></button></div>}
      <p className="resource-file-limit">Maximum size: {MAX_RESOURCE_FILE_SIZE / (1024 * 1024)} MB. Executable files are not accepted.</p>
      {file && progress !== null && <UploadProgress percentage={progress} fileName={file.name} />}
    </div>
  )
}
