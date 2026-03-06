import React, { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { FileText, Calendar, Copy, Download, Check } from 'lucide-react';
import { generateAppealLetter } from '../lib/benefits-service';
import { toast } from 'sonner';

interface BenefitsLetterGeneratorProps {
  onGenerate?: (data: { letter: string | null }) => void;
  userState?: string;
  childName?: string;
  childAge?: number;
}

export function BenefitsLetterGenerator({ onGenerate, userState = '', childName = '', childAge = 5 }: BenefitsLetterGeneratorProps) {
  const [insurance, setInsurance] = useState('');
  const [providerName, setProviderName] = useState('');
  const [parentName, setParentName] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [services, setServices] = useState({
    aba: true,
    speech: false,
    ot: false
  });
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const insuranceNames: Record<string, string> = {
    aetna: 'Aetna',
    bcbs: 'Blue Cross Blue Shield',
    cigna: 'Cigna',
    uhc: 'UnitedHealthcare',
    humana: 'Humana',
    kaiser: 'Kaiser Permanente',
    other: 'Insurance Provider',
  };

  const handleGenerate = () => {
    const selectedServices: string[] = [];
    if (services.aba) selectedServices.push('ABA Therapy');
    if (services.speech) selectedServices.push('Speech Therapy');
    if (services.ot) selectedServices.push('Occupational Therapy');

    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    const letter = generateAppealLetter({
      childName: childName || 'Your Child',
      childAge: childAge,
      parentName: parentName || 'Parent/Guardian',
      insuranceCompany: insuranceNames[insurance] || insurance || 'Insurance Provider',
      serviceRequested: selectedServices,
      providerName: providerName || undefined,
      state: userState,
      denialReason: denialReason || undefined,
    });

    setGeneratedLetter(letter);
    toast.success('Appeal letter generated');

    // Save to tracked requests
    const existing = JSON.parse(localStorage.getItem('aminy-benefit-requests') || '[]');
    existing.push({
      title: `${selectedServices.join(' & ')} Appeal`,
      status: 'submitted',
      date: new Date().toISOString(),
      type: 'appeal-letter',
    });
    localStorage.setItem('aminy-benefit-requests', JSON.stringify(existing));
  };

  const handleCopy = async () => {
    if (!generatedLetter) return;
    try {
      await navigator.clipboard.writeText(generatedLetter);
      setCopied(true);
      toast.success('Letter copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — try selecting and copying manually');
    }
  };

  const handleDownload = () => {
    if (!generatedLetter) return;
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appeal-letter-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Letter downloaded');
  };

  if (generatedLetter) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Appeal Letter</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-3 h-3 mr-1.5" />
              Download
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
            {generatedLetter}
          </pre>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGeneratedLetter(null)}>
            Edit & Regenerate
          </Button>
          <Button onClick={() => onGenerate?.({ letter: generatedLetter })}>
            Save & Track
          </Button>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Tip:</strong> Review the letter carefully and personalize it with specific details about your child's needs. Consider having your child's provider co-sign the letter for added weight.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Appeal Letter Generator</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date().toLocaleDateString()}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Generate a personalized appeal letter citing your state's autism mandate and federal protections.
      </p>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <Label>Your Name</Label>
          <Input
            placeholder="Parent/Guardian name"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
          />
        </div>

        <div>
          <Label>Insurance Provider</Label>
          <select
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">Select your insurance...</option>
            <option value="aetna">Aetna</option>
            <option value="bcbs">Blue Cross Blue Shield</option>
            <option value="cigna">Cigna</option>
            <option value="uhc">UnitedHealthcare</option>
            <option value="humana">Humana</option>
            <option value="kaiser">Kaiser Permanente</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <Label>Provider Name (if known)</Label>
          <Input
            placeholder="e.g., Dr. Smith"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
          />
        </div>

        <div>
          <Label>Denial Reason (if applicable)</Label>
          <Input
            placeholder="e.g., Not medically necessary, out of network"
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
          />
        </div>

        <div>
          <Label>Services Requesting</Label>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                checked={services.aba}
                onChange={(e) => setServices({...services, aba: e.target.checked})}
              />
              <span className="text-sm">ABA Therapy</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                checked={services.speech}
                onChange={(e) => setServices({...services, speech: e.target.checked})}
              />
              <span className="text-sm">Speech Therapy</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                checked={services.ot}
                onChange={(e) => setServices({...services, ot: e.target.checked})}
              />
              <span className="text-sm">Occupational Therapy</span>
            </label>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={handleGenerate}>
        <FileText className="w-4 h-4 mr-2" />
        Generate Appeal Letter
      </Button>

      {userState && (
        <p className="text-xs text-center text-muted-foreground">
          Will include {userState} state-specific legal citations and mandates
        </p>
      )}
    </div>
  );
}
