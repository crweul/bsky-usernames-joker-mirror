import "server-only"
import { AppBskyActorDefs } from "@atproto/api"
import { Check, X } from "lucide-react"

import { agent } from "@/lib/atproto"
import { prisma } from "@/lib/db"
import { hasExplicitSlur } from "@/lib/slurs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"
import { Stage } from "@/components/stage"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain
  return {
    title: `${domain} - get your community username for Bluesky`,
    description: `get your own ${domain} username`,
  }
}

export default async function IndexPage({
  params,
  searchParams,
}: {
  params: {
    domain: string
  }
  searchParams: {
    handle?: string
    "new-handle"?: string
  }
}) {
  const domain = params.domain
  let handle = searchParams.handle
  let newHandle = searchParams["new-handle"]
  let profile: AppBskyActorDefs.ProfileView | undefined
  let error1: string | undefined
  let error2: string | undefined

  if (handle) {
    try {
      if (!handle.includes(".")) {
        handle += ".bsky.social"
      }
      console.log("fetching profile", handle)
      const actor = await agent.getProfile({
        actor: handle,
      })
      if (!actor.success) throw new Error("fetch was not a success")
      profile = actor.data
    } catch (e) {
      console.error(e)
      error1 = (e as Error)?.message ?? "unknown error"
    }

    if (newHandle && profile) {
      newHandle = newHandle.trim().toLowerCase()
      if (!newHandle.includes(".")) {
        newHandle += "." + domain
      }
      if (!error1) {
        // regex: (alphanumeric, -, _).(domain)
        const validHandle = newHandle.match(
          new RegExp(`^[a-zA-Z0-9-_]+.${domain}$`)
        )
        if (validHandle) {
          try {
            const handle = newHandle.replace(`.${domain}`, "")
            if (hasExplicitSlur(handle)) {
              throw new Error("slur")
            }

            const existing = await prisma.user.findFirst({
              where: { handle },
              include: { domain: true },
            })
            if (existing && existing.domain.name === domain) {
              if (existing.did !== profile.did) {
                error2 = "username taken"
              }
            } else {
              await prisma.user.create({
                data: {
                  handle,
                  did: profile.did,
                  domain: {
                    connectOrCreate: {
                      where: { name: domain },
                      create: { name: domain },
                    },
                  },
                },
              })
            }
          } catch (e) {
            const actualError = (e as Error)?.message ?? "unknown error"
            console.error("New username registration error:", actualError)
            try {
              await fetch(process.env.DISCORD_ERROR_WEBHOOK!, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `<@270260819999064065> An error occurred at ${new Date().toISOString()}:\n\`\`\`${actualError}\`\`\``,
                }),
              })
            } catch (webhookErr) {
              console.error("Discord webhook failed:", webhookErr)
              error2 = "Webhook failure"
            }
            if (actualError !== "unknown error") {
              error2 = actualError
            }
          }
        } else {
          error2 = "invalid username"
        }
      }
    }
  }

  return (
    <main className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-4">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
          Get your own <span className="persona-font">{domain}</span> <br className="hidden sm:inline" />
          username for Bluesky
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Follow the instructions below to get your own {domain} username.
        </p>
      </div>
      <div>
        <Stage title="Enter your current username" number={1}>
          <form>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <div className="flex w-full max-w-sm items-center space-x-2">
                {newHandle && (
                  <input type="hidden" name="new-handle" value="" />
                )}
                <Input
                  type="text"
                  name="handle"
                  placeholder="example.bsky.social"
                  defaultValue={handle}
                  required
                />
                <Button type="submit">Submit</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your current username, not including the @.
              </p>
              {error1 && (
                <p className="flex flex-row items-center gap-2 text-sm text-red-500">
                  <X className="size-4" /> Username not found - please try again.
                </p>
              )}
              {profile && (
                <>
                  <p className="text-muted-forground mt-4 flex flex-row items-center gap-2 text-sm">
                    <Check className="size-4 text-green-500" /> Account found!
                  </p>
                  <Profile profile={profile} className="mt-4" />
                </>
              )}
            </div>
          </form>
        </Stage>
        <Stage title="Choose your new username" number={2} disabled={!profile}>
          <form>
            <input type="hidden" name="handle" value={handle} />
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  type="text"
                  name="new-handle"
                  placeholder={`example.${domain}`}
                  defaultValue={newHandle}
                />
                <Button type="submit">Submit</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the {domain} username that you would like to have, not
                including the @.
              </p>
              {error2 && (
                <p className="text-sm text-red-500">
                  {(() => {
                    switch (error2) {
                      case "username taken":
                        return "Username already taken, please choose a different username."
                      case "invalid username":
                      case "slur":
                        return "Invalid username, please choose a different username."
                      case "reserved":
                        return "Reserved username, please choose a different username."
                      default:
                        return `Unexpected error, the database may be out of order. Please try again later. If this issue persists, message @joker.tokyo on Bluesky.`
                    }
                  })()}
                </p>
              )}
            </div>
          </form>
        </Stage>
        <Stage
          title="Change your username within the Bluesky app."
          number={3}
          disabled={!newHandle || !!error2}
          last
        >
          <p className="max-w-lg text-sm">
            Go to Settings {"→"} Advanced {"→"} Change my handle. Select &quot;I
            have my own domain&quot; and enter{" "}
            {newHandle ? `"${newHandle}"` : "your new username"}. Finally, tap
            &quot;Verify DNS Record&quot;. Please note that it may take a few minutes for your new handle to be validated.
          </p>
        </Stage>
        <div className="mt-6 rounded-md bg-muted p-4">
          <h2 className="max-w-lg font-semibold">
            Registering a domain costs me money. If you would like to contribute, you can{" "}
            <a href="https://ko-fi.com/kylo" className="underline">
              help me fund this project
            </a>
            . ❤️
          </h2>
        </div>
      </div>
    </main>
  )
}

const RESERVED = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i))
