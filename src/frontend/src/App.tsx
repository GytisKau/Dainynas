import { Route, Routes, Navigate } from 'react-router'

import SiteHeader from './components/SiteHeader'

import { useAuthSession } from './auth/useAuthSession'

import AuthPage from './auth/AuthPage'
import SongPage from './songs/SongPage'
import SongCatalogPage from './catalog/SongCatalogPage'
import AlbumPage from './albums/AlbumPage'
import PerformerCatalogPage from './performers/PerformerCatalogPage'
import PerformerProfilePage from './performers/PerformerProfilePage'
import AlbumCatalogPage from './albums/AlbumCatalogPage'

export default function App() {
  const { session, saveSession, logout, loggingOut, message, restoreFailed, restoring } = useAuthSession()

  if (restoring) {
    return (
      <main className="mx-auto w-full max-w-308 px-4 py-8">
        <p role="status" className="text-muted">Atkuriama sesija…</p>
      </main>
    )
  }

  if (restoreFailed) {
    return (
      <main className="mx-auto w-full max-w-308 px-4 py-8">
        <p role="alert">Nepavyko susisiekti su serveriu ir atkurti sesijos.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-accent underline underline-offset-4"
        >
          Bandyti dar kartą
        </button>
      </main>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page font-sans text-ink">
      <SiteHeader 
        signedIn={session !== null}
        loggingOut={loggingOut}
        onLogout={logout}
      />

      {message && (
        <p
          role="status"
          className="mx-auto w-full max-w-308 px-4 pt-3 text-sm text-muted"
        >
          {message}
        </p>
      )}

      <Routes>
        <Route path="/" element={<SongCatalogPage />} />
        <Route path="/dainos/:songId" element={<SongPage />} />
        <Route path="/pateikejai" element={<PerformerCatalogPage token={session?.token ?? null} />} />
        <Route path="/pateikejai/:performerId" element={
          <PerformerProfilePage token={session?.token} />
        }/>
        <Route path="/albumai" element={<AlbumCatalogPage />} />
        <Route path="/albumai/:albumId" element={<AlbumPage />} />

        <Route path="/prisijungti" element={ session
            ? <Navigate to="/" replace />
            : <AuthPage key="login" mode="login" onAuthenticated={saveSession} />
          }
        />
        <Route path="/registracija" element={ session
            ? <Navigate to="/" replace />
            : <AuthPage key="register" mode="register" onAuthenticated={saveSession} />
          }
        />
      </Routes>

      {/* <footer className="bg-chrome py-4 text-ink">
        <div className="mx-auto w-full max-w-308 px-4">
          Dainynas · Elektroninis folklorinių dainų dainynas
        </div>
      </footer> */}
    </div>
  )
}