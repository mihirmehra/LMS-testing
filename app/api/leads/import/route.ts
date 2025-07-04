// app/api/leads/import/route.ts

import { NextResponse } from 'next/server';
import { LeadsAPI } from '@/lib/api/leads';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export async function POST(request: Request) {
  try {
    console.log("[SERVER_API] /api/leads/import POST request received.");
    const formData = await request.formData();
    console.log("[SERVER_API] FormData parsed.");

    const file = formData.get('csvFile') as File | null;

    if (!file) {
      console.log("[SERVER_API] No file uploaded.");
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'text/csv') {
      console.log("[SERVER_API] Invalid file type:", file.type);
      return NextResponse.json({ message: 'Only CSV files are allowed' }, { status: 400 });
    }

    console.log(`[SERVER_API] File '${file.name}' (${file.size} bytes) received.`);
    // Using file.text() to directly get content as string, compatible with web streams
    const fileContent = await file.text();
    console.log("[SERVER_API] File content read as text. Length:", fileContent.length);

    const leadsToImport: any[] = [];
    console.log("[SERVER_API] Starting CSV parsing with csv-parser...");
    await new Promise<void>((resolve, reject) => {
      // Create a Node.js Readable stream from the string content for csv-parser
      const readableStream = new Readable();
      readableStream.push(fileContent);
      readableStream.push(null); // No more data

      readableStream
        .pipe(csvParser())
        .on('data', (data) => {
          // console.log("[SERVER_API] Parsed CSV row:", data); // Uncomment for very verbose logging of each row
          leadsToImport.push(data)
        })
        .on('end', () => {
          console.log(`[SERVER_API] CSV parsing completed. ${leadsToImport.length} rows parsed.`);
          resolve();
        })
        .on('error', (error) => {
          console.error("[SERVER_API] CSV parsing error:", error);
          reject(error);
        });
    });

    console.log("[SERVER_API] Calling LeadsAPI.bulkCreateLeads with parsed data...");
    const importResults = await LeadsAPI.bulkCreateLeads(leadsToImport);
    console.log("[SERVER_API] LeadsAPI.bulkCreateLeads completed. Results:", importResults);

    return NextResponse.json(importResults, { status: 200 });

  } catch (error: any) {
    console.error('[SERVER_API] Global Error during lead import:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }, // Include stack in dev
      { status: 500 }
    );
  }
}