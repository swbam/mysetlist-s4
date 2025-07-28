// Following feature removed from MySetlist
// This API route has been disabled as the app no longer supports following artists
// MySetlist is focused on setlist voting, not social following features

import { type NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "Following feature has been removed from MySetlist",
      message:
        "MySetlist now focuses on setlist voting instead of following artists",
    },
    { status: 410 } // Gone - indicates feature was removed
  )
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "Following feature has been removed from MySetlist",
      message:
        "MySetlist now focuses on setlist voting instead of following artists",
    },
    { status: 410 } // Gone - indicates feature was removed
  )
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "Following feature has been removed from MySetlist",
      message:
        "MySetlist now focuses on setlist voting instead of following artists",
    },
    { status: 410 } // Gone - indicates feature was removed
  )
}
