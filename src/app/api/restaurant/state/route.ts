import { NextRequest, NextResponse } from "next/server";
import { RestaurantService } from "@/lib/services/restaurant-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const state = await RestaurantService.getRestaurantState(tenantId);
    return NextResponse.json(state);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, state } = body;

    if (!tenantId || !state) {
      return NextResponse.json({ error: "Missing tenantId or state" }, { status: 400 });
    }

    const ok = await RestaurantService.saveRestaurantState(tenantId, state);
    return NextResponse.json({ success: ok });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
