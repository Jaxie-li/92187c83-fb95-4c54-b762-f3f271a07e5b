export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">You&apos;re Offline</h1>
        <p className="text-gray-600 mb-4">
          You can still view your chat history, but you won&apos;t be able to send new messages until you&apos;re back online.
        </p>
        <p className="text-sm text-gray-500">
          Check your internet connection and try again.
        </p>
      </div>
    </div>
  )
}