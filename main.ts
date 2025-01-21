import {
  createBot,
  createDesiredPropertiesObject,
  ButtonComponent,
  MessageComponentTypes,
  ButtonStyles,
  ActionRow
} from 'discordeno'
import { Platform, PlatformButton, Response } from './types.ts'

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

function getThumbnailUrl(song: Response) {
  // sort in thumbnail image height and returns the largest image's url
  const entities = Array.from(Object.values(song.entitiesByUniqueId))
  entities.sort((a, b) => (a.thumbnailHeight ?? 0) - (b.thumbnailHeight ?? 0))
  return entities.pop()?.thumbnailUrl
}

function getSongTitle(song: Response) {
  for (const entry of Object.values(song.entitiesByUniqueId)) {
    if (entry?.title) return entry.title
  }
}

function createButtons(song: Response): ActionRow['components'] {
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
  }
})

const bot = createBot({
  token,
  desiredProperties,
  intents:
    (1 << 9) | // GuildMessages
    (1 << 15), // MessageContent
  events: {
    ready: ({ shardId }) => {
      console.log(`Shard ${shardId} ready`)
    },
    messageCreate(message) {
      if (message.author.bot || message.author.system) {
        return
      }

      let songUrls: string[] = []

      songUrlRegexList.forEach((regex) => {
        const matched = message.content.match(regex)
        if (matched) songUrls = songUrls.concat(matched)
      })

      songUrls.forEach(async (songUrl) => {
        const response = await fetch(
          `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(songUrl)}&userCountry=${countryCode}`
        )

        const song: Response = await response.json()
        const buttons = createButtons(song)

        const thumbnailUrl = getThumbnailUrl(song)
        const embed = {
          title: getSongTitle(song),
          footer: { text: footer },
          thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
          timestamp: new Date().toISOString(),
          color: 0x3498db
        }

        const platformWithPreviewList: Platform[] = ['spotify', 'youtube']

        // Send link for previewing songs
        try {
          let isReplied = false

          for (const platform of platformWithPreviewList) {
            if (!isReplied && song.linksByPlatform[platform]) {
              isReplied = true
              await bot.helpers.sendMessage(message.channelId, {
                messageReference: {
                  messageId: message.id,
                  channelId: message.channelId,
                  guildId: message.guildId,
                  failIfNotExists: false
                },
                content: song.linksByPlatform[platform].url,
                components: [
                  {
                    type: MessageComponentTypes.ActionRow,
                    components: buttons as [ButtonComponent]
                  }
                ]
              })
            }
          }

          if (!isReplied) {
            await bot.helpers.sendMessage(message.channelId, {
              messageReference: {
                messageId: message.id,
                channelId: message.channelId,
                guildId: message.guildId,
                failIfNotExists: false
              },
              embeds: [embed],
              components: [
                {
                  type: MessageComponentTypes.ActionRow,
                  components: buttons as [ButtonComponent]
                }
              ]
            })
          }
        } catch (error) {
          console.error('Failed to send message:', error)
        }
      })
    }
  }
})

await bot.start()
