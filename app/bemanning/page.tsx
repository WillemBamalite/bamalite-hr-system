import Link from "next/link"

export default function CrewManagementPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Bemanning Management</h1>
        <p className="text-gray-600 mb-6">Deze pagina is vervangen door de dashboard.</p>
        <Link 
          href="/" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Ga naar Dashboard
        </Link>
      </div>
    </div>
  )
}
