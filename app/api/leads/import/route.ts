// app/api/leads/import/route.ts

import { NextResponse } from 'next/server';
import { LeadsAPI } from '@/lib/api/leads';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx'; // Import XLSX for Excel parsing
import { Readable } from 'stream'; // For converting string to stream for csv-parser

export async function POST(request: Request) {
  try {
    console.log("[SERVER_API] /api/leads/import POST request received.");
    // Log the incoming Content-Type header for debugging purposes
    console.log("[SERVER_API] Incoming Request Content-Type:", request.headers.get('Content-Type'));

    // Attempt to parse FormData. This line will throw the TypeError if Content-Type is incorrect.
    const formData = await request.formData();
    console.log("[SERVER_API] FormData parsed successfully."); // This log will only appear if Content-Type was correct

    // Retrieve the file. Check for 'file' first, then fallback to 'csvFile' for compatibility.
    const file = (formData.get('file') || formData.get('csvFile')) as File | null;

    if (!file) {
      console.log("[SERVER_API] No file uploaded.");
      return NextResponse.json({ message: 'No file uploaded. Ensure the file is sent under "file" or "csvFile" key.' }, { status: 400 });
    }

    const fileName = file.name || 'unknown_file';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const fileContentType = file.type; // e.g., 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    console.log(`[SERVER_API] File '${fileName}' (${file.size} bytes, Type: ${fileContentType}) received.`);

    let leadsToImport: any[] = [];

    // --- Conditional Parsing Logic based on File Type ---
    if (fileExtension === 'csv' || fileContentType === 'text/csv') {
      console.log("[SERVER_API] Identified as CSV. Starting CSV parsing with csv-parser...");
      const fileContent = await file.text(); // Read CSV file content as text

      await new Promise<void>((resolve, reject) => {
        const readableStream = new Readable();
        readableStream.push(fileContent);
        readableStream.push(null); // Signal end of stream

        readableStream
          .pipe(csvParser())
          .on('data', (data) => {
            leadsToImport.push(data);
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
    } else if (fileExtension === 'xlsx' ||
               fileContentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               fileContentType === 'application/vnd.ms-excel') {
      console.log("[SERVER_API] Identified as XLSX. Starting XLSX parsing with SheetJS...");
      const arrayBuffer = await file.arrayBuffer(); // Read XLSX file content as ArrayBuffer
      const data = new Uint8Array(arrayBuffer);

      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // Get the first sheet
        const worksheet = workbook.Sheets[sheetName];
        leadsToImport = XLSX.utils.sheet_to_json(worksheet); // Convert sheet data to JSON array

        console.log(`[SERVER_API] XLSX parsing completed. ${leadsToImport.length} rows parsed.`);
      } catch (xlsxError: any) {
        console.error("[SERVER_API] XLSX parsing error:", xlsxError);
        return NextResponse.json(
          { message: `Failed to parse XLSX file: ${xlsxError.message || 'Corrupted file format'}` },
          { status: 400 }
        );
      }
    } else {
      console.log(`[SERVER_API] Unsupported file type: '${fileName}' with content type '${fileContentType}'.`);
      return NextResponse.json({ message: 'Unsupported file type. Only CSV and XLSX files are allowed.' }, { status: 400 });
    }

    if (leadsToImport.length === 0) {
      console.log("[SERVER_API] No data rows found in the parsed file.");
      return NextResponse.json(
        { message: 'File parsed successfully, but no lead data rows were found. Please check your file content.' },
        { status: 400 }
      );
    }

    console.log("[SERVER_API] Calling LeadsAPI.bulkCreateLeads with parsed data...");
    // Since you asked not to add auth, userId is not available here.
    // Ensure LeadsAPI.bulkCreateLeads can handle this or a default user.
    const importResults = await LeadsAPI.bulkCreateLeads(leadsToImport);
    console.log("[SERVER_API] LeadsAPI.bulkCreateLeads completed. Results:", importResults);

    return NextResponse.json(importResults, { status: 200 });

  } catch (error: any) {
    console.error('[SERVER_API] Global Error during lead import:', error);

    // --- Specific Error Handling for Content-Type Mismatch ---
    if (error instanceof TypeError && error.message.includes('Content-Type')) {
        console.error("[SERVER_API] Content-Type Mismatch: The frontend is NOT sending 'multipart/form-data'.");
        console.error("[SERVER_API] Please ensure your frontend's fetch/axios call sends the file using 'FormData' as the body.");
        return NextResponse.json(
            {
                message: 'Invalid request format: Frontend must send file data as "multipart/form-data".',
                error: error.message,
                details: "The server expected file upload via FormData, but received a different content type. Please review your frontend's API call for file import.",
                solution: "In your frontend's fetch/axios call, make sure you create a new FormData() object, append your file to it, and set this FormData object as the 'body' of the request. Do NOT manually set 'Content-Type' header for FormData."
            },
            { status: 400 } // Bad Request
        );
    }
    // --- End Specific Error Handling ---

    // Generic error handling for other issues
    return NextResponse.json(
      {
        message: 'Internal server error occurred during file processing.',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        total: 0, successful: 0, failed: 0, errors: [`Server error: ${error.message || 'Unknown error occurred.'}`]
      },
      { status: 500 }
    );
  }
}