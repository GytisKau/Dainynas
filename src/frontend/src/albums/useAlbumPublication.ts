import { useState } from 'react'
import type { RowAction } from '../components/RowActions'
import { useToast } from '../components/useToast'
import { changeAlbumPublication, type AlbumPublicationAction } from './albumApi'
import type { Album } from './types'

export function useAlbumPublication(
  album: Album,
  token: string | undefined,
  disabled: boolean,
  onChanged: () => void,
) {
  const [publishing, setPublishing] = useState(false)
  const notify = useToast()

  async function publish(action: AlbumPublicationAction) {
    const link = album.links[action]
    if (!token || !link || disabled || publishing) return

    setPublishing(true)

    try {
      await changeAlbumPublication(link.href, action, token)
    } catch (error) {
      notify('error', error instanceof TypeError
        ? 'Nepavyko gauti atsakymo. Prieš kartodamas veiksmą atnaujink albumą.'
        : error instanceof Error ? error.message : 'Albumo būsenos pakeisti nepavyko.')
      return
    } finally {
      setPublishing(false)
    }

    notify('success', action === 'submit'
      ? `Albumas „${album.title}“ pateiktas peržiūrai.`
      : `Albumo „${album.title}“ paskelbimas atšauktas.`)

    onChanged()
  }

  const actions: RowAction[] = []

  if (token && album.links.submit) {
    actions.push({
      icon: 'submit',
      label: 'Pateikti peržiūrai',
      onSelect: () => void publish('submit'),
    })
  }

  if (token && album.links.unpublish) {
    actions.push({
      icon: 'unpublish',
      label: 'Atšaukti paskelbimą',
      onSelect: () => void publish('unpublish'),
    })
  }

  return { actions, publishing }
}