import { type NextRequest } from "next/server"

import { prisma } from "@/lib/db"

export const GET = async (
  _req: NextRequest,
  { params }: { params: { domain: string; username: string } }
) => {
  const { did } = await prisma.user.findFirstOrThrow({
    where: { username: params.username, domain: { name: params.domain } },
  })
  return new Response(did, {
    headers: {
      "content-type": "text/plain",
    },
  })
}
