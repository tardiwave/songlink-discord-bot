# Songlink Discord bot

Powered by [Songlink/Odesli](https://odesli.co)

## Description

When you post a song URL of Amazon Music, Apple Music, or Spotify, the bot adds links to other platforms. You can even
get a link to YouTube.

## Local Development
1. Install [deno](https://deno.land)
2. Create a `.env` file with:
   ```env
   TOKEN=your_discord_bot_token
   COUNTRY=FR
   ```
3. Run `deno task dev` for development
4. Run `deno task start` for production

## Deployment
1. Create a new project on [Deno Deploy](https://deno.com/deploy)
2. Link your GitHub repository
3. Configure the following environment variables in Deno Deploy:
   - `TOKEN`: Your Discord bot token
   - `COUNTRY`: Your country code (e.g., FR)
4. Select `main.ts` as your entry file
5. Deploy!
