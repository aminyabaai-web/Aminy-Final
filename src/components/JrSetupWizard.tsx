import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { 
  ArrowLeft,
  ArrowRight,
  Smartphone,
  QrCode,
  Shield,
  Settings,
  Gamepad2,
  Volume2,
  VolumeX,
  Headphones,
  Baby,
  Star,
  Gift,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface JrProfile {
  childNickname: string;
  childPin: string;
  voiceMode: 'off' | 'auto-captions' | 'voice-only';
  contentLevel: 'gentle' | 'standard';
  rewardsEnabled: boolean;
  baselineCompleted?: boolean;
  calibratedAt?: Date;
  pairedAt?: Date;
  deviceType?: 'this-device' | 'another-device';
  pairingCode?: string;
}

interface JrSetupWizardProps {
  childName: string;
  onComplete: (profile: JrProfile) => void;
  onCancel?: () => void;
  onBack?: () => void;
}

export const JrSetupWizard: React.FC<JrSetupWizardProps> = ({ 
  childName, 
  onComplete, 
  onCancel 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<JrProfile>({
    childNickname: childName,
    childPin: '',
    voiceMode: 'auto-captions',
    contentLevel: 'gentle',
    rewardsEnabled: true,
    deviceType: 'this-device'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Generate 6-digit pairing code for "another device"
  useEffect(() => {
    if (profile.deviceType === 'another-device' && !profile.pairingCode) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setProfile(prev => ({ ...prev, pairingCode: code }));
    }
  }, [profile.deviceType]);

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 2) {
      if (!profile.childNickname.trim()) {
        newErrors.childNickname = 'Nickname is required';
      }
      if (!profile.childPin || profile.childPin.length !== 4) {
        newErrors.childPin = 'PIN must be exactly 4 digits';
      }
      if (!/^\d{4}$/.test(profile.childPin)) {
        newErrors.childPin = 'PIN must contain only numbers';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        // Step 3 - Start calibration
        startCalibration();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel?.();
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    
    // Simulate calibration progress over 18 seconds
    const interval = setInterval(() => {
      setCalibrationProgress(prev => {
        const newProgress = prev + (100 / 36); // 36 intervals over 18 seconds
        
        if (newProgress >= 100) {
          clearInterval(interval);
          // Complete calibration
          const completedProfile: JrProfile = {
            ...profile,
            baselineCompleted: true,
            calibratedAt: new Date(),
            pairedAt: profile.deviceType === 'another-device' ? new Date() : undefined
          };
          
          setTimeout(() => {
            toast.success("Aminy Ease is ready! 🎉", {
              description: "Calibration complete. Your child can start using Ease.",
            });
            onComplete(completedProfile);
          }, 500);
          
          return 100;
        }
        
        return newProgress;
      });
    }, 500); // Update every 500ms for smooth progress
  };

  const updateProfile = (field: keyof JrProfile, value: JrProfile[keyof JrProfile]) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderStep1 = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="text-center">
        <div className="p-3 bg-blue-100 rounded-full inline-flex mb-4">
          <Smartphone className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">Choose Device</h3>
        <p className="text-muted-foreground">
          Where will {profile.childNickname} use Ease?
        </p>
      </div>

      <RadioGroup 
        value={profile.deviceType} 
        onValueChange={(value) => updateProfile('deviceType', value)}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-[#FAF7F2] transition-colors">
          <RadioGroupItem value="this-device" id="this-device" />
          <Label htmlFor="this-device" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-[#5A6B7A]" />
              <div>
                <div className="font-medium">This device</div>
                <div className="text-sm text-muted-foreground">Set up Ease on this device</div>
              </div>
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-[#FAF7F2] transition-colors">
          <RadioGroupItem value="another-device" id="another-device" />
          <Label htmlFor="another-device" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-[#5A6B7A]" />
              <div>
                <div className="font-medium">Another device</div>
                <div className="text-sm text-muted-foreground">Pair with QR code or pairing code</div>
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <div className="text-center">
        <div className="p-3 bg-purple-100 rounded-full inline-flex mb-4">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">Kid Profile & Safety</h3>
        <p className="text-muted-foreground">
          Set up your child's Jr Mode experience.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="childNickname" className="text-sm font-medium text-primary">
            Child's Nickname
          </Label>
          <Input
            id="childNickname"
            value={profile.childNickname}
            onChange={(e) => updateProfile('childNickname', e.target.value)}
            placeholder="What should we call them?"
            className={`mt-2 aminy-input-left ${errors.childNickname ? 'border-red-500' : ''}`}
          />
          {errors.childNickname && (
            <p className="text-red-500 text-xs mt-1">{errors.childNickname}</p>
          )}
        </div>

        <div>
          <Label htmlFor="childPin" className="text-sm font-medium text-primary">
            4-Digit PIN
          </Label>
          <Input
            id="childPin"
            type="number"
            value={profile.childPin}
            onChange={(e) => updateProfile('childPin', e.target.value.slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            className={`mt-2 aminy-input-left ${errors.childPin ? 'border-red-500' : ''}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used to exit Jr Mode and access parent controls
          </p>
          {errors.childPin && (
            <p className="text-red-500 text-xs mt-1">{errors.childPin}</p>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-primary mb-3 block">
            Voice Mode
          </Label>
          <Select value={profile.voiceMode} onValueChange={(value) => updateProfile('voiceMode', value)}>
            <SelectTrigger className="mt-2 aminy-state-select">
              <SelectValue placeholder="Select voice mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4" />
                  <span>Off</span>
                </div>
              </SelectItem>
              <SelectItem value="auto-captions">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  <span>Auto-captions</span>
                </div>
              </SelectItem>
              <SelectItem value="voice-only">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Voice only</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-primary mb-3 block">
            Content Level
          </Label>
          <Select value={profile.contentLevel} onValueChange={(value) => updateProfile('contentLevel', value)}>
            <SelectTrigger className="mt-2 aminy-state-select">
              <SelectValue placeholder="Select content level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gentle">
                <div className="flex items-center gap-2">
                  <Baby className="w-4 h-4" />
                  <span>Gentle</span>
                </div>
              </SelectItem>
              <SelectItem value="standard">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>Standard</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="rewards"
            checked={profile.rewardsEnabled}
            onCheckedChange={(checked) => updateProfile('rewardsEnabled', checked)}
          />
          <Label htmlFor="rewards" className="text-sm font-medium text-primary cursor-pointer">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-yellow-600" />
              <span>Enable rewards & celebrations</span>
            </div>
          </Label>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (profile.deviceType === 'another-device') {
      return (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="text-center">
            <div className="p-3 bg-green-100 rounded-full inline-flex mb-4">
              <QrCode className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">Pair Another Device</h3>
            <p className="text-muted-foreground">
              Use the QR code or pairing code on your child's device.
            </p>
          </div>

          <Card className="p-6 text-center bg-[#FAF7F2]">
            {/* Mock QR Code */}
            <div className="w-32 h-32 bg-white border-2 border-[#E8E4DF] rounded-lg mx-auto mb-4 flex items-center justify-center">
              <QrCode className="w-16 h-16 text-[#8A9BA8]" />
            </div>
            
            <div className="text-lg font-mono font-bold text-primary mb-2">
              {profile.pairingCode}
            </div>
            <p className="text-sm text-muted-foreground">
              Enter this code on your child's device
            </p>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              1. Open Aminy on your child's device<br />
              2. Tap "Join Family" and scan QR or enter code<br />
              3. Complete setup together
            </p>
            
            <Button
              onClick={handleNext}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Device Paired Successfully
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4 sm:space-y-6">
        <div className="text-center">
          <div className="p-3 bg-green-100 rounded-full inline-flex mb-4">
            <Gamepad2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">Calibration Mini-Game</h3>
          <p className="text-muted-foreground">
            Quick activity to personalize {profile.childNickname}'s experience.
          </p>
        </div>

        {!isCalibrating ? (
          <Card className="p-6 text-center bg-gradient-to-br from-[#FAF7F2] to-[#F0EDE8]">
            <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h4 className="font-semibold text-primary mb-2">Ready to Start!</h4>
            <p className="text-sm text-muted-foreground mb-4">
              This takes about 15-20 seconds and helps us understand how {profile.childNickname} learns best.
            </p>
            <Button
              onClick={handleNext}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Calibration
            </Button>
          </Card>
        ) : (
          <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-blue-50">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <RefreshCw className="w-16 h-16 text-blue-600 animate-spin" />
            </div>
            <h4 className="font-semibold text-primary mb-2">Calibrating...</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Learning {profile.childNickname}'s preferences
            </p>
            <Progress value={calibrationProgress} className="h-3 mb-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(calibrationProgress)}% complete
            </p>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Progress Header */}
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Jr Setup</span>
            <Badge variant="outline" className="text-xs">Step {currentStep} of 3</Badge>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Navigation */}
        {!isCalibrating && (
          <div className="flex items-center justify-between aminy-form-navigation-breathing">
            <Button
              onClick={handleBack}
              variant="outline"
              className="aminy-back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {currentStep < 3 && (
              <Button
                onClick={handleNext}
                className="aminy-continue-button aminy-gentle-shimmer"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};