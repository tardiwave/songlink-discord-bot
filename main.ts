import {
  createBot,
  createDesiredPropertiesObject,
  ButtonStyles,
  InteractionTypes,
  MessageComponentTypes,
  type ActionRow,
  type ButtonComponent,
  type CreateApplicationCommand,
  type Integration,
  type Message
} from 'discordeno'
import { Platform, PlatformButton, SongLinkResponse } from './types.ts'

const token = Deno.env.get('TOKEN') as string
const countryCode = Deno.env.get('COUNTRY') ?? 'FR'
const footer = 'Listen to this music on other platforms '
const songUrlRegexList = [
  /https?:\/\/.*?spotify\.com\/\S*/g,
  /https?:\/\/music\.amazon\.com\/\S*/g,
  /https?:\/\/.*?music\.apple\.com\/\S*/g
]

const platforms: PlatformButton[] = [
  { slug: 'amazonMusic', label: 'Amazon Music' },
  { slug: 'appleMusic', label: 'Apple Music' },
  { slug: 'spotify', label: 'Spotify' },
  { slug: 'youtube', label: 'YouTube' }
]
const platformWithPreviewList: Platform[] = ['spotify', 'youtube']

function getThumbnailUrl(song: SongLinkResponse) {
  // sort in thumbnail image height and returns the largest image's url
  const entities = Array.from(Object.values(song.entitiesByUniqueId))
  entities.sort((a, b) => (a.thumbnailHeight ?? 0) - (b.thumbnailHeight ?? 0))
  return entities.pop()?.thumbnailUrl
}

function getPlatformWithPreviewUrl(song: SongLinkResponse): string | null {
  for (const platform of platformWithPreviewList) {
    if (song.linksByPlatform[platform]) {
      return song.linksByPlatform[platform].url
    }
  }
  return null
}

function getSongTitle(song: SongLinkResponse) {
  for (const entry of Object.values(song.entitiesByUniqueId)) {
    if (entry?.title) return entry.title
  }
}

async function fetchSongData(songUrl: string): Promise<SongLinkResponse> {
  const response = await fetch(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(songUrl)}&userCountry=${countryCode}`
  )
  return response.json()
}

function createButtons(song: SongLinkResponse): ActionRow['components'] {
  const row: ButtonComponent[] = []
  for (const platform of platforms) {
    if (song.linksByPlatform[platform.slug]) {
      row.push({
        type: MessageComponentTypes.Button,
        style: ButtonStyles.Link,
        label: platform.label,
        url: song.linksByPlatform[platform.slug].url
      })
    }
  }

  row.push({
    type: MessageComponentTypes.Button,
    style: ButtonStyles.Link,
    url: song.pageUrl,
    label: row.length ? 'More' : 'Details'
  })
  return row as [ButtonComponent]
}

const musicLinkCommand: CreateApplicationCommand = {
  name: 'song',
  description: 'Get links to a song across different platforms',
  options: [
    {
      name: 'url',
      description: 'URL of the song from Spotify, Apple Music, or Amazon Music',
      type: 3, // STRING
      required: true
    }
  ]
} as const

const desiredProperties = createDesiredPropertiesObject({
  message: {
    id: true,
    channelId: true,
    guildId: true,
    author: true,
    content: true
  },
  user: {
    toggles: true
  },
  interaction: {
    id: true,
    type: true,
    data: true,
    token: true
  }
})

const bot = createBot({
  token,
  desiredProperties,
  intents:
    (1 << 9) | // GuildMessages
    (1 << 15), // MessageContent
  events: {
    ready: async ({ shardId }) => {
      console.log(`Shard ${shardId} ready`)

      await bot.helpers.createGlobalApplicationCommand(musicLinkCommand)
    },
    messageCreate(message: Message) {
      if (message.author.bot || message.author.system) {
        return
      }

      let songUrls: string[] = []

      songUrlRegexList.forEach((regex) => {
        const matched = message.content.match(regex)
        if (matched) songUrls = songUrls.concat(matched)
      })

      songUrls.forEach(async (songUrl) => {
        const song = await fetchSongData(songUrl)
        const buttons = createButtons(song)

        const platformWithPreviewUrl = getPlatformWithPreviewUrl(song)
        const thumbnailUrl = getThumbnailUrl(song)
        const embed = {
          title: getSongTitle(song),
          footer: { text: footer },
          thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
          timestamp: new Date().toISOString(),
          color: 0x3498db
        }

        try {
          await bot.helpers.sendMessage(message.channelId, {
            messageReference: {
              messageId: message.id,
              channelId: message.channelId,
              guildId: message.guildId,
              failIfNotExists: false
            },
            content: platformWithPreviewUrl ? platformWithPreviewUrl : undefined,
            embeds: !platformWithPreviewUrl ? [embed] : undefined,
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: buttons as ActionRow['components']
              }
            ]
          })
        } catch (error) {
          console.error('Failed to send message:', error)
        }
      })
    },
    async interactionCreate(interaction: Integration) {
      if (!interaction.data) return
      if (interaction.type !== InteractionTypes.ApplicationCommand) return
      if (interaction.data?.name !== 'song') return

      const songUrl = interaction.data.options?.[0].value as string

      const isValidUrl = songUrlRegexList.some((regex) => regex.test(songUrl))
      if (!isValidUrl) {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: 'Invalid music URL. Please provide a valid Spotify, Apple Music, or Amazon Music link.',
            flags: 64
          }
        })
        return
      }

      try {
        await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: 'Searching for music links...'
          }
        })

        const song = await fetchSongData(songUrl)
        const buttons = createButtons(song)
        const thumbnailUrl = getThumbnailUrl(song)
        const platformWithPreviewUrl = getPlatformWithPreviewUrl(song)

        const embed = {
          title: getSongTitle(song),
          footer: { text: footer },
          thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
          timestamp: new Date().toISOString(),
          color: 0x3498db
        }

        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
          content: platformWithPreviewUrl ? platformWithPreviewUrl : undefined,
          embeds: !platformWithPreviewUrl ? [embed] : undefined,
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: buttons as ActionRow['components']
            }
          ]
        })
      } catch (error) {
        console.error('Failed to process music link:', error)
        await bot.helpers.editOriginalInteractionResponse(interaction.token, {
          content: 'An error occurred while processing your request. Please try again later.'
        })
      }
    }
  }
})

await bot.start()
