import { NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  try {
    const results = await searchCompanies(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
