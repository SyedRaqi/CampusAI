type UploadProgressProps = { percentage: number; fileName: string }

export default function UploadProgress({ percentage, fileName }: UploadProgressProps) {
  return (
    <div className="upload-progress" role="status" aria-live="polite">
      <div className="upload-progress-copy"><span>{fileName}</span><strong>{percentage}%</strong></div>
      <progress value={percentage} max={100} aria-label={`Upload progress for ${fileName}`} />
    </div>
  )
}
