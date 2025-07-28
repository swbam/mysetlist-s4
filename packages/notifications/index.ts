import { Knock } from "@knocklabs/node"
import { keys } from "./keys"

const key = keys().KNOCK_SECRET_API_KEY

// Knock constructor expects an options object with apiKey property
export const notifications = key ? new Knock({ apiKey: key }) : null
