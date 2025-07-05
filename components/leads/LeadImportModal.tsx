// LeadImportModal.tsx

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner'; // Assuming you have sonner for toasts
// import Papa from 'papaparse'; // No longer needed for sending the file directly
// import * as XLSX from 'xlsx'; // No longer needed for sending the file directly

interface LeadImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (importedCount: number) => void;
}

export function LeadImportModal({ open, onOpenChange, onImportComplete }: LeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  // parsedLeads is no longer used for sending data to backend, but can be kept for client-side preview if needed.
  // For now, let's simplify and remove its dependency for import.
  // const [parsedLeads, setParsedLeads] = useState<any[]>([]); 
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(null); // Clear previous file
    // setParsedLeads([]); // Clear previous parsed data if it was used for preview
    setResults(null); // Clear previous results
    setProgress(0); // Reset progress

    if (selectedFile) {
      const fileName = selectedFile.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      const fileType = selectedFile.type;

      // Basic validation for file types
      if (fileExtension === 'csv' || fileType === 'text/csv' ||
          fileExtension === 'xlsx' ||
          fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          fileType === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        // Client-side parsing (PapaParse/XLSX) removed from here as backend will handle it.
        // If you need client-side preview/validation, you would re-implement parsing here.
        toast.success(`File selected: ${selectedFile.name}`);
      } else {
        toast.error("Please select a valid .csv or .xlsx file.");
        setResults({
          total: 0,
          successful: 0,
          failed: 0,
          errors: ["Please select a valid .csv or .xlsx file."]
        });
      }
    }
  };

  // Removed parseSelectedFile as client-side parsing is not required for the backend's FormData approach.
  // If you re-introduce client-side data preview, you can bring this back.

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import.');
      return;
    }

    setImporting(true);
    setProgress(20); // Initial progress feedback
    setResults(null); // Clear previous results
    console.log("CLIENT: Starting import process. File selected:", file.name, "Type:", file.type);

    try {
      // 1. Create FormData object
      const formData = new FormData();
      // 2. Append the file to the FormData object
      // The key 'file' must match what your backend (route.ts) expects from formData.get('file')
      formData.append('file', file);

      console.log("CLIENT: Sending POST request to /api/leads/import with FormData...");
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        // 3. Send the FormData directly as the body
        body: formData,
        // IMPORTANT: DO NOT manually set 'Content-Type' header here for FormData.
        // The browser will automatically set it to 'multipart/form-data' with the correct boundary.
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // Assuming you store auth token
        },
      });
      console.log("CLIENT: Received response from API. Status:", response.status, "Status Text:", response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json(); // Try to parse JSON error from server
          console.error("CLIENT: API Error Response Data:", errorData);
        } catch (jsonParseError) {
          console.error("CLIENT: Failed to parse error response as JSON. Raw text response:", await response.text(), "Parse error:", jsonParseError);
          errorData = { message: `Server responded with status ${response.status} but no valid JSON.`, details: "See browser console for raw response." };
        }
        throw new Error(errorData.message || `Failed to import leads. Server status: ${response.status}`);
      }

      console.log("CLIENT: API response is OK. Parsing JSON results...");
      const importResults = await response.json();
      console.log("CLIENT: Import Results from API:", importResults);

      setResults(importResults);
      onImportComplete(importResults.successful);
      
      console.log("CLIENT: Import process completed successfully from client perspective.");

    } catch (error: any) {
      console.error('CLIENT: Catch block: Error during lead import:', error.message || error);
      setResults({
        total: 0,
        successful: 0,
        failed: 0,
        errors: [error.message || 'An unexpected error occurred during import. Check browser console for details.']
      });
      onImportComplete(0); // Notify parent of 0 successful imports on error
    } finally {
      setProgress(100); // Ensure progress always finishes
      setImporting(false); // Stop importing state
      setFile(null); // Clear selected file after import attempt
      // setParsedLeads([]); // No longer relevant for sending, but could be cleared for UI
      console.log("CLIENT: Finally block executed. Import state reset.");
    }
  };

  const downloadTemplate = () => {
    // Ensure this template matches the columns expected by your backend's bulkCreateLeads method
    const csvContent = "name,email,phone,property type,budget range,preferred locations,source,status,lead score,lead type,notes\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'lead_import_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file to add multiple leads to your system.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="lead-file">Upload Lead File</Label>
            <Input
              id="lead-file"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              disabled={importing}
              className="file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 file:border-blue-200 file:rounded-md file:py-2 file:px-4 file:mr-4 file:hover:bg-blue-100"
            />
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                Selected file: {file.name}
              </p>
            )}
            {!file && (
                <p className="text-sm text-gray-500 mt-1">
                  Please select a .csv or .xlsx file to begin.
                </p>
            )}
            {/* The parsedLeads.length check is no longer relevant for determining if file can be imported
                since parsing happens on the backend. We just need a file selected. */}
            {/* {file && parsedLeads.length === 0 && !importing && ( 
              <p className="text-sm text-red-500 mt-1">
                File selected but no valid data could be parsed. Please ensure the file is correctly formatted.
              </p>
            )} */}
          </div>

          {importing && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500">{progress}% Imported</p>
            </div>
          )}

          {results && (
            <div className="space-y-2">
              <Label>Import Results</Label>
              <Alert variant={results.failed > 0 ? "destructive" : "default"}>
                <AlertDescription className="text-sm">
                  <div className="font-medium">Summary:</div>
                  <p>{results.successful} out of {results.total} leads imported successfully.</p>
                  {results.failed > 0 && <p className="text-red-700">{results.failed} leads failed to import.</p>}
                  {results.errors.length > 0 && (
                    <div className="mt-2 text-red-600">
                      <div className="font-medium">Errors:</div>
                      <ul className="list-disc list-inside">
                        {results.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.successful > 0 && results.failed === 0 && (
                    <div className="flex items-center text-green-600 mt-2">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      All leads imported successfully!
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CSV Template</CardTitle>
                <DialogDescription>
                  Download a sample CSV template to help you format your data.
                </DialogDescription>
                <DialogDescription>
                  <b>Please note : </b>
                  <br></br>
                  <br></br>
                  Duplicate Number leads, 
                  <br></br>
                  <br></br>
                  Number bigger or smaller that 10 digits will not be imported,
                  <br></br>
                  <br></br>
                  The system will automatically add 91 before the number
                </DialogDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expected CSV Columns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>name (required)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>email (required)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>phone (required)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>lead type (required)</span>
                  </div>
                  <div className="text-gray-600">property type (optional)</div>
                  <div className="text-gray-600">budget range (optional)</div>
                  <div className="text-gray-600">preferred locations (optional)</div>
                  <div className="text-gray-600">source (optional)</div>
                  <div className="text-gray-600">status (optional)</div>
                  <div className="text-gray-600">lead score (optional)</div>
                  <div className="text-gray-600">notes (optional)</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing} // Only disable if no file or currently importing
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? 'Importing...' : 'Import Leads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}