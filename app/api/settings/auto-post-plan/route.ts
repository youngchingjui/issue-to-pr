import { NextRequest, NextResponse } from "next/server"

import {
  getAutoPostPlanSetting,
  setAutoPostPlanSetting,
} from "@/lib/services/SettingsService"
import type { AutoPostPlanSetting } from "@/lib/types/settings"
import { getInstallationId } from "@/lib/utils/utils-server"

// --- GET: return setting --- //
export async function GET(req: NextRequest) {
  const installationId = getInstallationId()
  if (!installationId) {
    return NextResponse.json(
      { error: "Missing or invalid installation id" },
      { status: 400 }
    )
  }
  const enabled = await getAutoPostPlanSetting(Number(installationId))
  return NextResponse.json({ enabled })
}

// --- PATCH: update setting --- //
export async function PATCH(req: NextRequest) {
  const installationId = getInstallationId()
  if (!installationId) {
    return NextResponse.json(
      { error: "Missing or invalid installation id" },
      { status: 400 }
    )
  }
  let data: Partial<AutoPostPlanSetting> = {}
  try {
    data = await req.json()
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (typeof data.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Missing 'enabled' boolean" },
      { status: 400 }
    )
  }
  await setAutoPostPlanSetting(Number(installationId), data.enabled)
  return NextResponse.json({ enabled: data.enabled })
}
