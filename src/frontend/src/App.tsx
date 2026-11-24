import { Route, Routes } from 'react-router'

import SiteHeader from './components/SiteHeader'

import SongPage from './songs/SongPage'
import SongCatalogPage from './catalog/SongCatalogPage'
import AlbumPage from './albums/AlbumPage'
import PerformerCatalogPage from './performers/PerformerCatalogPage'
import PerformerProfilePage from './performers/PerformerProfilePage'
import AlbumCatalogPage from './albums/AlbumCatalogPage'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-page font-sans text-ink">
      <SiteHeader />

      <Routes>
        <Route path="/" element={<SongCatalogPage />} />
        <Route path="/dainos/:songId" element={<SongPage />} />
        <Route path="/pateikejai" element={<PerformerCatalogPage />} />
        <Route path="/pateikejai/:performerId" element={<PerformerProfilePage />} />
        <Route path="/albumai" element={<AlbumCatalogPage />} />
        <Route path="/albumai/:albumId" element={<AlbumPage />} />
      </Routes>

      <footer className="bg-chrome py-4 text-ink">
        <div className="mx-auto w-full max-w-308 px-4">
          Dainynas · Elektroninis folklorinių dainų dainynas
        </div>
      </footer>
    </div>
  )
}