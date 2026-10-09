export default function LoadingScreen() {
  return (
    <div className="loading-screen" aria-live="polite" aria-busy="true">
      <div className="loading-spinner" />
      <p>Loading CampusConnect AI</p>
    </div>
  )
}
