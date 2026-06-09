// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * FiscalAgentExport.tsx
 * PDF Export for Fiscal Agent Submissions (Acumen, DCI, PPL)
 *
 * Features:
 * - Generate formatted PDF timesheets
 * - Support multiple fiscal agent formats
 * - Service code mapping (97151, 97153, etc.)
 * - Signature capture
 * - Batch export capabilities
 */

import React, { useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  DollarSign,
  Printer,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Loader2,
  FileCheck,
  Pen,
  X,
  Plus
} from 'lucide-react';

interface ServiceEntry {
  id: string;
  date: Date;
  serviceCode: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  units: number;
  rate: number;
  notes?: string;
  providerName: string;
  clientName: string;
}

interface FiscalAgentExportProps {
  userId: string;
  childId: string;
  childName: string;
  providerName: string;
  fiscalAgent: 'acumen' | 'dci' | 'ppl' | 'custom';
}

// Service codes for ABA therapy
const SERVICE_CODES = [
  { code: '97151', name: 'Behavior Assessment', unit: '15 min', rate: 37.50 },
  { code: '97152', name: 'Supporting Assessment', unit: '15 min', rate: 25.00 },
  { code: '97153', name: 'Adaptive Behavior Treatment', unit: '15 min', rate: 22.50 },
  { code: '97154', name: 'Group Adaptive Behavior', unit: '15 min', rate: 15.00 },
  { code: '97155', name: 'Behavior Treatment w/ Protocol Modification', unit: '15 min', rate: 37.50 },
  { code: '97156', name: 'Family Adaptive Behavior Guidance', unit: '15 min', rate: 37.50 },
  { code: '97157', name: 'Multiple Family Group Guidance', unit: '15 min', rate: 25.00 },
  { code: '97158', name: 'Group Behavior Treatment Modification', unit: '15 min', rate: 25.00 },
];

// Fiscal agent configurations
const FISCAL_AGENT_CONFIG = {
  acumen: {
    name: 'Acumen Fiscal Agent',
    logo: '/acumen-logo.png',
    fields: ['participant_id', 'service_coordinator', 'authorization_number'],
    format: 'acumen-standard',
  },
  dci: {
    name: 'DCI (Disability Care Inc)',
    logo: '/dci-logo.png',
    fields: ['member_id', 'case_manager', 'prior_auth'],
    format: 'dci-standard',
  },
  ppl: {
    name: 'PPL (Public Partnerships LLC)',
    logo: '/ppl-logo.png',
    fields: ['participant_id', 'employer_id', 'service_agreement'],
    format: 'ppl-standard',
  },
  custom: {
    name: 'Custom Format',
    logo: null,
    fields: [],
    format: 'generic',
  },
};

export function FiscalAgentExport({
  userId,
  childId,
  childName,
  providerName,
  fiscalAgent,
}: FiscalAgentExportProps) {
  const [entries, setEntries] = useState<ServiceEntry[]>([
    // Demo data
    {
      id: '1',
      date: new Date(),
      serviceCode: '97153',
      serviceName: 'Adaptive Behavior Treatment',
      startTime: '09:00',
      endTime: '11:00',
      units: 8,
      rate: 22.50,
      notes: 'Worked on communication goals, reinforcement procedures',
      providerName,
      clientName: childName,
    },
    {
      id: '2',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      serviceCode: '97156',
      serviceName: 'Family Adaptive Behavior Guidance',
      startTime: '14:00',
      endTime: '15:00',
      units: 4,
      rate: 37.50,
      notes: 'Parent training on positive reinforcement strategies',
      providerName,
      clientName: childName,
    },
  ]);

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState({
    participantId: 'PA-2024-12345',
    authorizationNumber: 'AUTH-97153-001',
    serviceCoordinator: 'Maria Garcia',
  });
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  const config = FISCAL_AGENT_CONFIG[fiscalAgent];

  // Calculate totals
  const totalUnits = entries.reduce((sum, e) => sum + e.units, 0);
  const totalHours = totalUnits * 0.25; // 15 min units
  const totalAmount = entries.reduce((sum, e) => sum + (e.units * e.rate), 0);

  // Generate PDF
  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      // In production, use a library like jsPDF or call a server-side PDF generator
      // For now, we'll create a printable HTML document

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fiscal Agent Timesheet - ${config.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .logo { font-size: 24px; font-weight: bold; color: #6B9080; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-item { padding: 5px 0; }
            .info-label { font-weight: bold; color: #666; font-size: 12px; }
            .info-value { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; font-weight: bold; }
            .totals { text-align: right; margin-top: 20px; }
            .totals-row { display: flex; justify-content: flex-end; gap: 40px; }
            .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; padding-top: 5px; text-align: center; font-size: 12px; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${config.name}</div>
            <div>
              <div>Timesheet Period</div>
              <div><strong>${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}</strong></div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Participant Name</div>
              <div class="info-value">${childName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Participant ID</div>
              <div class="info-value">${additionalInfo.participantId}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Provider Name</div>
              <div class="info-value">${providerName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Authorization #</div>
              <div class="info-value">${additionalInfo.authorizationNumber}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service Code</th>
                <th>Service Description</th>
                <th>Start</th>
                <th>End</th>
                <th>Units</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td>${e.date.toLocaleDateString()}</td>
                  <td>${e.serviceCode}</td>
                  <td>${e.serviceName}</td>
                  <td>${e.startTime}</td>
                  <td>${e.endTime}</td>
                  <td>${e.units}</td>
                  <td>$${e.rate.toFixed(2)}</td>
                  <td>$${(e.units * e.rate).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Total Units: <strong>${totalUnits}</strong></span>
              <span>Total Hours: <strong>${totalHours.toFixed(2)}</strong></span>
              <span>Total Amount: <strong>$${totalAmount.toFixed(2)}</strong></span>
            </div>
          </div>

          <div class="signature-section">
            <div>
              <div class="signature-line">Provider Signature</div>
            </div>
            <div>
              <div class="signature-line">Date</div>
            </div>
            <div>
              <div class="signature-line">Parent/Guardian Signature</div>
            </div>
            <div>
              <div class="signature-line">Date</div>
            </div>
          </div>

          <div class="footer">
            <p>Generated by Aminy on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>This document is intended for submission to ${config.name}. Please retain a copy for your records.</p>
          </div>
        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

    } catch (error) {
      console.error('[FiscalAgentExport] Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add new entry
  const [newEntry, setNewEntry] = useState<Partial<ServiceEntry>>({
    date: new Date(),
    serviceCode: '97153',
    startTime: '09:00',
    endTime: '11:00',
  });

  const addEntry = () => {
    const service = SERVICE_CODES.find(s => s.code === newEntry.serviceCode);
    if (!service || !newEntry.date || !newEntry.startTime || !newEntry.endTime) return;

    // Calculate units (15 min increments)
    const start = new Date(`2000-01-01T${newEntry.startTime}`);
    const end = new Date(`2000-01-01T${newEntry.endTime}`);
    const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const units = Math.ceil(minutes / 15);

    const entry: ServiceEntry = {
      id: `entry-${Date.now()}`,
      date: newEntry.date!,
      serviceCode: newEntry.serviceCode || '',
      serviceName: service.name,
      startTime: newEntry.startTime!,
      endTime: newEntry.endTime!,
      units,
      rate: service.rate,
      notes: newEntry.notes,
      providerName,
      clientName: childName,
    };

    setEntries(prev => [...prev, entry]);
    setShowAddEntry(false);
    setNewEntry({
      date: new Date(),
      serviceCode: '97153',
      startTime: '09:00',
      endTime: '11:00',
    });
  };

  // Remove entry
  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#1B2733]">Fiscal Agent Export</h2>
          <p className="text-[#5A6B7A]">Generate timesheets for {config.name}</p>
        </div>
        <Badge className="bg-[#6B9080]/10 text-[#6B9080]">
          <Building2 className="w-3.5 h-3.5 mr-1" />
          {config.name}
        </Badge>
      </div>

      {/* Info Card */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-medium text-[#1B2733]">Participant Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm text-[#5A6B7A] mb-1">Participant Name</label>
                <p className="font-medium">{childName}</p>
              </div>
              <div>
                <label className="block text-sm text-[#5A6B7A] mb-1">Participant ID</label>
                <Input
                  value={additionalInfo.participantId}
                  onChange={(e) => setAdditionalInfo(prev => ({ ...prev, participantId: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-[#5A6B7A] mb-1">Authorization #</label>
                <Input
                  value={additionalInfo.authorizationNumber}
                  onChange={(e) => setAdditionalInfo(prev => ({ ...prev, authorizationNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-[#5A6B7A] mb-1">Service Coordinator</label>
                <Input
                  value={additionalInfo.serviceCoordinator}
                  onChange={(e) => setAdditionalInfo(prev => ({ ...prev, serviceCoordinator: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-medium text-[#1B2733]">Date Range</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm text-[#5A6B7A] mb-1">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm text-[#5A6B7A] mb-1">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Service Entries */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#1B2733]">Service Entries</h3>
          <Button onClick={() => setShowAddEntry(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Entry
          </Button>
        </div>

        {/* Add Entry Form */}
        {showAddEntry && (
          <div className="mb-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-[#5A6B7A] mb-1">Date</label>
                <Input
                  type="date"
                  value={newEntry.date?.toISOString().split('T')[0]}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, date: new Date(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs text-[#5A6B7A] mb-1">Service Code</label>
                <select
                  value={newEntry.serviceCode}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, serviceCode: e.target.value }))}
                  className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm"
                >
                  {SERVICE_CODES.map(s => (
                    <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5A6B7A] mb-1">Start Time</label>
                <Input
                  type="time"
                  value={newEntry.startTime}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-[#5A6B7A] mb-1">End Time</label>
                <Input
                  type="time"
                  value={newEntry.endTime}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={addEntry} className="flex-1 bg-primary hover:bg-[#216982]">
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setShowAddEntry(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-2 text-xs font-medium text-[#5A6B7A]">Date</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-[#5A6B7A]">Code</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-[#5A6B7A]">Service</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-[#5A6B7A]">Time</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#5A6B7A]">Units</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#5A6B7A]">Rate</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-[#5A6B7A]">Amount</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-neutral-100">
                  <td className="py-3 px-2 text-sm">{entry.date.toLocaleDateString()}</td>
                  <td className="py-3 px-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {entry.serviceCode}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-sm">{entry.serviceName}</td>
                  <td className="py-3 px-2 text-sm text-neutral-600">
                    {entry.startTime} - {entry.endTime}
                  </td>
                  <td className="py-3 px-2 text-sm text-right">{entry.units}</td>
                  <td className="py-3 px-2 text-sm text-right">${entry.rate.toFixed(2)}</td>
                  <td className="py-3 px-2 text-sm text-right font-medium">
                    ${(entry.units * entry.rate).toFixed(2)}
                  </td>
                  <td className="py-3 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(entry.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-8 text-[#5A6B7A]">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No service entries yet</p>
            <p className="text-sm">Click "Add Entry" to log services</p>
          </div>
        )}
      </Card>

      {/* Totals & Export */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-[#5A6B7A]">Total Units</p>
              <p className="text-xl sm:text-2xl font-bold text-[#1B2733]">{totalUnits}</p>
            </div>
            <div>
              <p className="text-sm text-[#5A6B7A]">Total Hours</p>
              <p className="text-xl sm:text-2xl font-bold text-[#1B2733]">{totalHours.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-[#5A6B7A]">Total Amount</p>
              <p className="text-xl sm:text-2xl font-bold text-[#6B9080]">${totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={generatePDF}>
              <Printer className="w-4 h-4 mr-2" />
              Print Preview
            </Button>
            <Button
              onClick={generatePDF}
              disabled={isGenerating || entries.length === 0}
              className="bg-primary hover:bg-[#216982]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Service Code Reference */}
      <Card className="p-4 sm:p-5 md:p-6">
        <button
          onClick={() => document.getElementById('service-codes')?.classList.toggle('hidden')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-medium text-[#1B2733]">Service Code Reference</h3>
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        </button>
        <div id="service-codes" className="hidden mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {SERVICE_CODES.map(service => (
              <div key={service.code} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <Badge variant="secondary" className="font-mono mb-1">{service.code}</Badge>
                  <p className="text-sm text-neutral-700">{service.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#1B2733]">${service.rate.toFixed(2)}</p>
                  <p className="text-xs text-[#5A6B7A]">per {service.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default FiscalAgentExport;
