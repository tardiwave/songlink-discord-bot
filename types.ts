export type Platform =
  | 'spotify'
  | 'itunes'
  | 'appleMusic'
  | 'youtube'
  | 'youtubeMusic'
  | 'google'
  | 'googleStore'
  | 'pandora'
  | 'deezer'
  | 'tidal'
  | 'amazonStore'
  | 'amazonMusic'
  | 'soundcloud'
  | 'napster'
  | 'yandex'
  | 'spinrilla'
  | 'audius'

export type SongLinkResponse = {
  entityUniqueId: string
  userCountry: string
  pageUrl: string
  linksByPlatform: {
    [platform in Platform]: {
      entityUniqueId: string
      url: string
      nativeAppUriMobile?: string
      nativeAppUriDesktop?: string
    }
  }

  entitiesByUniqueId: {
    [entityUniqueId: string]: Entry
  }
}

export type APIProvider =
  | 'spotify'
  | 'itunes'
  | 'youtube'
  | 'google'
  | 'pandora'
  | 'deezer'
  | 'tidal'
  | 'amazon'
  | 'soundcloud'
  | 'napster'
  | 'yandex'
  | 'spinrilla'
  | 'audius'

export type Entry = {
  id: string
  type: 'song' | 'album'
  title?: string
  artistName?: string
  thumbnailUrl?: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  apiProvider: APIProvider
  platforms: Platform[]
}

export interface PlatformButton {
  slug: Platform
  label: string
}
