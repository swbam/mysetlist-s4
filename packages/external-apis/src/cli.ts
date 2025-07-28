#!/usr/bin/env node
import { program } from "commander"
import { SyncScheduler } from "./services/sync-scheduler"

const scheduler = new SyncScheduler()

program
  .name("mysetlist-sync")
  .description("CLI for syncing external API data")
  .version("1.0.0")

program
  .command("initial")
  .description(
    "Run initial sync for popular artists, major venues, and upcoming shows"
  )
  .action(async () => {
    try {
      await scheduler.runInitialSync()
      process.exit(0)
    } catch (_error) {
      process.exit(1)
    }
  })

program
  .command("daily")
  .description("Run daily sync for upcoming shows")
  .action(async () => {
    try {
      await scheduler.runDailySync()
      process.exit(0)
    } catch (_error) {
      process.exit(1)
    }
  })

program
  .command("location")
  .description("Sync data for a specific location")
  .requiredOption("-c, --city <city>", "City name")
  .option("-s, --state <state>", "State code")
  .action(async (options) => {
    try {
      await scheduler.syncByLocation(options.city, options.state)
      process.exit(0)
    } catch (_error) {
      process.exit(1)
    }
  })

program
  .command("artist")
  .description("Sync data for a specific artist")
  .requiredOption("-n, --name <name>", "Artist name")
  .action(async (options) => {
    try {
      await scheduler.syncArtistData(options.name)
      process.exit(0)
    } catch (_error) {
      process.exit(1)
    }
  })

program
  .command("custom")
  .description("Run custom sync with specific options")
  .option("--artists", "Sync popular artists")
  .option("--venues", "Sync venues")
  .option("--shows", "Sync shows")
  .option("--setlists", "Sync setlists")
  .option("-c, --city <city>", "City name")
  .option("-s, --state <state>", "State code")
  .option("-a, --artist <artist>", "Artist name")
  .option("--start-date <date>", "Start date (ISO format)")
  .option("--end-date <date>", "End date (ISO format)")
  .action(async (options) => {
    try {
      await scheduler.syncCustom({
        artists: options.artists,
        venues: options.venues,
        shows: options.shows,
        setlists: options.setlists,
        city: options.city,
        stateCode: options.state,
        artistName: options.artist,
        startDate: options.startDate,
        endDate: options.endDate,
      })
      process.exit(0)
    } catch (_error) {
      process.exit(1)
    }
  })

program
  .command("show")
  .description("Sync details for a specific show")
  .requiredOption("-i, --id <id>", "Show ID")
  .action(async (options) => {
    try {
      await scheduler.syncShowDetails(options.id)
      process.exit(0)
    } catch (_error) {
      process.exit(1)
    }
  })

program.parse()
