export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Plan Not Found</h1>
        <p className="text-gray-600">The requested plan could not be found.</p>
      </div>
    </div>
  )
}
