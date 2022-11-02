import {
  ButtonComponent,
  DiscordButtonStyles,
  DiscordMessageComponentTypes,
  endpoints,
  rest,
  startBot,
  Embed,
  DiscordenoMessage,
} from './deps.ts'

import { Response, PlatformButton, Platform } from './types.ts'

const countryCode = Deno.env.get('COUNTRY') ?? 'FR'
const footer = 'Listen to this music on other platforms '
const songUrlRegexList = [
  /https?:\/\/.*?spotify\.com\/\S*/g,
  /https?:\/\/music\.amazon\.com\/\S*/g,
  /https?:\/\/.*?music\.apple\.com\/\S*/g,
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

async function reply(message: DiscordenoMessage, buttons: ButtonComponent[], embed: Embed | null, content: string) {
  await message
    .reply(
      {
        embeds: embed ? [embed] : undefined,
        content,
        components: [
          {
            type: DiscordMessageComponentTypes.ActionRow,
            components: <[ButtonComponent]>buttons,
          },
        ],
      },
      false,
    )
    .catch(console.error)
}

const platforms: PlatformButton[] = [
  { slug: 'amazonMusic', label: 'Amazon Music' },
  { slug: 'appleMusic', label: 'Apple Music' },
  { slug: 'spotify', label: 'Spotify' },
  { slug: 'youtube', label: 'YouTube' },
]

function createButtons(song: Response) {
  const row: ButtonComponent[] = []
  for (const platform of platforms) {
    if (song.linksByPlatform[platform.slug]) {
      row.push({
        type: DiscordMessageComponentTypes.Button,
        style: DiscordButtonStyles.Link,
        label: platform.label,
        url: song.linksByPlatform[platform.slug].url,
      })
    }
  }

  row.push({
    type: DiscordMessageComponentTypes.Button,
    style: DiscordButtonStyles.Link,
    url: song.pageUrl,
    label: row.length ? 'More' : 'Details',
  })
  return row
}

startBot({
  token: Deno.env.get('TOKEN') as string,
  intents: ['Guilds', 'GuildMessages'],
  eventHandlers: {
    ready() {
      console.log('Successfully connected to gateway')
    },

    messageCreate(message) {
      if (message.isBot) return
      let songUrls: string[] = []
      songUrlRegexList.forEach((regex) => {
        const matched = message.content.match(regex)
        if (matched) songUrls = songUrls.concat(matched)
      })

      songUrls.forEach(async (songUrl) => {
        const response = await fetch(
          `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(songUrl)}&userCountry=${countryCode}`,
        )
        const song: Response = await response.json()
        const buttons = createButtons(song)

        const thumbnailUrl = getThumbnailUrl(song)
        const embed: Embed = {
          title: getSongTitle(song),
          footer: { text: footer },
          thumbnail: { url: thumbnailUrl },
        }

        const platformWithPreviewList: Platform[] = ['spotify', 'youtube']

        // Send link for previewing songs
        let isReplied = false
        for (const platform of platformWithPreviewList) {
          if (!isReplied && song.linksByPlatform[platform]) {
            isReplied = true
            reply(message, buttons, null, song.linksByPlatform[platform].url)
          }
        }

        if (!isReplied) {
          reply(message, buttons, embed, '')
        }

        // Remove user message embed
        // await message.edit({ flags: 4 }).catch(console.error);  // clear embeds (not working)
        await rest
          .runMethod(
            'patch',
            endpoints.CHANNEL_MESSAGE(message.channelId, message.id),
            { flags: 4 }, // clear embeds
          )
          .catch(console.error)
      })
    },
  },
})
