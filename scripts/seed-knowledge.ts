#!/usr/bin/env tsx
/**
 * Seed knowledge_docs table from Marketing/*.md files.
 * Run: npx tsx scripts/seed-knowledge.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.PUBLIC_SUPABASE_ANON_KEY!
);

const MARKETING_DIR = join(process.cwd(), "Marketing");

const DOCS = [
    {
        slug: "creative-matrix-spine",
        title: "Creative Idea Matrix (SPINE Framework)",
        category: "framework",
        file: "Creative Matrix.md",
    },
    {
        slug: "about-jason",
        title: "About Jason K Williamson & e2 Agency",
        category: "about",
        file: "About Jason.md",
    },
    {
        slug: "homepage-e2",
        title: "e2 Agency Homepage (e2.agency)",
        category: "homepage",
        file: "e2 Home.md",
    },
    {
        slug: "playbook-2026",
        title: "2026 High-Converting Agency Landing Page Playbook",
        category: "framework",
        file: "The definitive 2026 playbook for high-converting agency call-booking pages.md",
    },
];

async function main() {
    let seeded = 0;
    let skipped = 0;

    for (const doc of DOCS) {
        const filePath = join(MARKETING_DIR, doc.file);
        let content: string;

        try {
            content = readFileSync(filePath, "utf-8");
        } catch {
            console.warn(`  SKIP: "${doc.file}" not found`);
            skipped++;
            continue;
        }

        const { error } = await supabase
            .from("knowledge_docs")
            .upsert(
                {
                    slug: doc.slug,
                    title: doc.title,
                    category: doc.category,
                    content,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "slug" }
            );

        if (error) {
            console.error(`  ERROR [${doc.slug}]:`, error.message);
        } else {
            console.log(`  OK    [${doc.slug}] (${content.length} chars)`);
            seeded++;
        }
    }

    console.log(`\nDone: ${seeded} seeded, ${skipped} skipped`);
}

main().catch(console.error);
