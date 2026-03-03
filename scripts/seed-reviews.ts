#!/usr/bin/env tsx
/**
 * Seed reviews table from public/reviews (1).csv
 * Run: npx tsx scripts/seed-reviews.ts
 *
 * CSV columns (0-indexed):
 *  0: type
 *  1: integration
 *  2: title
 *  3: text
 *  4: rating
 *  5: attachments
 *  6: url
 *  7: date
 *  8: platform_id
 *  9: video_mp4_url
 * 10: tags
 * 11: likes
 * 12: customer_name
 * 13: customer_email
 * 14: customer_avatar
 * 15: customer_tagline
 * 16: customer_company
 * 17: customer_company_logo
 * 18: reward
 * 19: customer_url
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.PUBLIC_SUPABASE_ANON_KEY!
);

function parseCSV(raw: string): string[][] {
    const rows: string[][] = [];
    let i = 0;
    let inRow = false;

    while (i < raw.length) {
        const row: string[] = [];
        inRow = true;

        while (inRow && i < raw.length) {
            let cell = "";

            if (raw[i] === '"') {
                // Quoted cell
                i++; // skip opening quote
                while (i < raw.length) {
                    if (raw[i] === '"' && raw[i + 1] === '"') {
                        cell += '"';
                        i += 2;
                    } else if (raw[i] === '"') {
                        i++; // skip closing quote
                        break;
                    } else {
                        cell += raw[i++];
                    }
                }
            } else {
                // Unquoted cell
                while (i < raw.length && raw[i] !== "," && raw[i] !== "\n" && raw[i] !== "\r") {
                    cell += raw[i++];
                }
            }

            row.push(cell);

            if (i < raw.length && raw[i] === ",") {
                i++; // next cell
            } else {
                // End of row
                if (i < raw.length && raw[i] === "\r") i++;
                if (i < raw.length && raw[i] === "\n") i++;
                inRow = false;
            }
        }

        rows.push(row);
    }

    return rows;
}

async function main() {
    const filePath = join(process.cwd(), "public", "reviews (1).csv");
    const raw = readFileSync(filePath, "utf-8");
    const rows = parseCSV(raw);

    // Skip header row
    const dataRows = rows.slice(1).filter((r) => r.length > 4 && (r[3] || r[9]));

    const records = dataRows.map((r) => ({
        type: (r[0] || "text").trim(),
        customer_name: (r[12] || "").trim() || null,
        customer_company: (r[16] || "").trim() || null,
        customer_tagline: (r[15] || "").trim() || null,
        tag: (r[10] || "").trim() || null,
        rating: r[4] ? parseInt(r[4], 10) : null,
        body: (r[3] || "").trim() || null,
        review_date: r[7] ? new Date(r[7]).toISOString() : null,
    }));

    console.log(`Parsed ${records.length} reviews from CSV`);

    const BATCH = 20;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        const { error } = await supabase.from("reviews").insert(batch);

        if (error) {
            console.error(`  ERROR batch ${i / BATCH + 1}:`, error.message);
        } else {
            inserted += batch.length;
            console.log(`  OK    batch ${i / BATCH + 1} (${batch.length} records)`);
        }
    }

    console.log(`\nDone: ${inserted} reviews inserted`);
}

main().catch(console.error);
