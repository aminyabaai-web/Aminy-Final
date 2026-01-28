import React, { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Calendar } from 'lucide-react';

export function BenefitsLetterGenerator() {
  const [insurance, setInsurance] = useState('');
  const [providerName, setProviderName] = useState('');
  const [services, setServices] = useState({
    aba: false,
    speech: false,
    ot: false
  });
  const [lastChecked] = useState(new Date('2025-10-01'));

  const handleGenerate = () => {
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Benefits Letter Generator</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Last checked: {lastChecked.toLocaleDateString()}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Generate a letter requesting ABA coverage from your insurance
      </p>

      <div className="space-y-3 sm:space-y-4">
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
        Generate Letter
      </Button>
    </div>
  );
}
