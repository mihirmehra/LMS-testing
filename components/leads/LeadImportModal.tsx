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

interface LeadImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (importedCount: number) => void;
}

export function LeadImportModal({ open, onOpenChange, onImportComplete }: LeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
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
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResults(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const leads = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const lead: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim().replace(/"/g, '');
          
          switch (header) {
            case 'name':
            case 'full name':
              lead.name = value;
              break;
            case 'email':
            case 'primary email':
              lead.primaryEmail = value;
              break;
            case 'phone':
            case 'primary phone':
              lead.primaryPhone = value;
              break;
            case 'property type':
              lead.propertyType = value || 'Residential';
              break;
            case 'budget':
            case 'budget range':
              lead.budgetRange = value;
              break;
            case 'location':
            case 'preferred location':
              lead.preferredLocations = value ? [value] : ['Mumbai Central'];
              break;
            case 'source':
            case 'lead source':
              lead.source = value || 'Import';
              break;
            case 'notes':
              lead.notes = value || '';
              break;
          }
        });

        if (lead.name && lead.primaryEmail && lead.primaryPhone) {
          leads.push(lead);
        }
      }
    }

    return leads;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);

    try {
      const csvText = await file.text();
      const leads = parseCSV(csvText);
      
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < leads.length; i++) {
        try {
          const response = await fetch('/api/leads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...leads[i],
              status: 'New',
              leadScore: 'Medium',
              activities: [],
              attachments: [],
            }),
          });

          if (response.ok) {
            successful++;
          } else {
            failed++;
            errors.push(`Row ${i + 2}: Failed to import ${leads[i].name}`);
          }
        } catch (error) {
          failed++;
          errors.push(`Row ${i + 2}: Error importing ${leads[i].name}`);
        }

        setProgress(((i + 1) / leads.length) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setResults({
        total: leads.length,
        successful,
        failed,
        errors: errors.slice(0, 10), // Show only first 10 errors
      });

      if (successful > 0) {
        onImportComplete(successful);
      }
    } catch (error) {
      alert('Error reading file. Please check the format.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,email,phone,property type,budget range,location,source,notes
John Doe,john@example.com,+91-9876543210,Residential,₹50,00,000 - ₹75,00,000,Mumbai Central,Website,Interested in 2BHK
Jane Smith,jane@example.com,+91-9876543211,Commercial,₹1,00,00,000 - ₹2,00,00,000,Bandra,Referral,Looking for office space`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setFile(null);
    setProgress(0);
    setResults(null);
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetModal();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Import Leads from CSV</span>
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple leads at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">CSV Template</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Download our template to ensure your CSV file has the correct format
              </p>
              <Button variant="outline" onClick={downloadTemplate} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <div>
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
            {file && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                <FileText className="h-4 w-4" />
                <span>{file.name} selected</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing leads...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {results && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Import Complete!</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-1 font-medium">{results.total}</span>
                    </div>
                    <div>
                      <span className="text-green-600">Successful:</span>
                      <span className="ml-1 font-medium">{results.successful}</span>
                    </div>
                    <div>
                      <span className="text-red-600">Failed:</span>
                      <span className="ml-1 font-medium">{results.failed}</span>
                    </div>
                  </div>
                  {results.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                      <ul className="text-xs space-y-1">
                        {results.errors.map((error, index) => (
                          <li key={index} className="text-red-600">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Required Fields Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Required CSV Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
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
                <div className="text-gray-600">property type (optional)</div>
                <div className="text-gray-600">budget range (optional)</div>
                <div className="text-gray-600">location (optional)</div>
                <div className="text-gray-600">source (optional)</div>
                <div className="text-gray-600">notes (optional)</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || importing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? 'Importing...' : 'Import Leads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}