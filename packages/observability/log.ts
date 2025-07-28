// Dynamic import to avoid server-side issues
let logtail: any = console

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  import("@logtail/next").then(({ log }) => {
    logtail = log
  })
}

export const log =
  process.env.NODE_ENV === "production" && typeof window !== "undefined"
    ? logtail
    : console
