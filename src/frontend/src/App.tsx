import SongCatalogPage from './catalog/SongCatalogPage'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-page font-sans text-ink">
      <header className="bg-chrome py-4">
        <div className="mx-auto w-full max-w-[77rem] px-4">
          <a href="/" className="font-semibold text-ink">
            Dainynas
          </a>
        </div>
      </header>

      <SongCatalogPage />

      <footer className="bg-chrome py-4 text-ink">
        <div className="mx-auto w-full max-w-[77rem] px-4">
          Dainynas · Elektroninis folklorinių dainų dainynas
        </div>
      </footer>
    </div>
  )
}