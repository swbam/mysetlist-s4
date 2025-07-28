import "server-only"
import { getUser } from "@repo/auth/server"
import { Svix } from "svix"
import { keys } from "../keys"

const svixToken = keys().SVIX_TOKEN

export const send = async (eventType: string, payload: object) => {
  if (!svixToken) {
    throw new Error("SVIX_TOKEN is not set")
  }

  const svix = new Svix(svixToken)
  const user = await getUser()

  if (!user?.id) {
    return
  }

  return svix.message.create(user.id, {
    eventType,
    payload: {
      eventType,
      ...payload,
    },
    application: {
      name: user.id,
      uid: user.id,
    },
  })
}

export const getAppPortal = async () => {
  if (!svixToken) {
    throw new Error("SVIX_TOKEN is not set")
  }

  const svix = new Svix(svixToken)
  const user = await getUser()

  if (!user?.id) {
    return
  }

  return svix.authentication.appPortalAccess(user.id, {
    application: {
      name: user.id,
      uid: user.id,
    },
  })
}
