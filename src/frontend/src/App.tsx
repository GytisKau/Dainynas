import { Link, Route, Routes } from 'react-router'
import SongPage from './songs/SongPage'
import SongCatalogPage from './catalog/SongCatalogPage'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-page font-sans text-ink">
      <header className="bg-chrome py-4">
        <div className="mx-auto w-full max-w-308 px-4">
          <Link to="/" className="font-semibold text-ink">Dainynas</Link>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<SongCatalogPage />} />
        <Route path="/dainos/:songId" element={<SongPage />} />
      </Routes>

      <footer className="bg-chrome py-4 text-ink">
        <div className="mx-auto w-full max-w-308 px-4">
          Dainynas · Elektroninis folklorinių dainų dainynas
        </div>
      </footer>
    </div>
  )
}