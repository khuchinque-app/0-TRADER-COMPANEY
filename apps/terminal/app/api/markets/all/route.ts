import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Load pair catalog at startup
let pairCatalog: any[] = [];

try {
  const catalogPath = path.resolve(process.cwd(), "docs/research/indodax-pairs.json");
  const data = fs.readFileSync(catalogPath, "utf-8");
  pairCatalog = JSON.parse(data);
} catch {
  // Fallback if file not found
  pairCatalog = [];
}

export async function GET() {
  return NextResponse.json(pairCatalog);
}
