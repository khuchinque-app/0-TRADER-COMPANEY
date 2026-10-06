import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CATALOG_PATH = path.resolve(__dirname, "../../../../docs/research/indodax-pairs.json");

let pairCatalog: any[] = [];

try {
  const data = fs.readFileSync(CATALOG_PATH, "utf-8");
  pairCatalog = JSON.parse(data);
} catch {
  pairCatalog = [];
}

export async function GET() {
  return NextResponse.json(pairCatalog);
}
