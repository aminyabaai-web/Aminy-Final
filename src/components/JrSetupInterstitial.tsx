import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  ArrowLeft,
  ArrowRight,
  Play,
  Heart,
  Zap,
  BarChart3,
  Gamepad2
} from 'lucide-react';

interface JrSetupInterstitialProps {
  onSetupNow: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const JrSetupInterstitial: React.FC<JrSetupInterstitialProps> = ({ 
  onSetupNow, 
  onSkip, 
  onBack 
}) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header - Keep as Step 4 of 7 */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 4 of 7</span>
            <Badge variant="outline" className="text-xs">Needs & Schedule</Badge>
          </div>
          <Progress value={57} className="h-2" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Centered Interstitial Card */}
        <Card className="p-8 text-center aminy-card">
          {/* Icon */}
          <div className="p-4 bg-green-100 rounded-full inline-flex mb-4 sm:mb-6">
            <Gamepad2 className="w-8 h-8 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-primary mb-3">
            Set up Aminy Junior?
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
            Your child's companion for practice & play. You can skip and set it up later.
          </p>

          {/* Feature Bullets */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-1 mb-8 text-sm">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700 font-medium">Speech & social mini-games</span>
            </div>
            
            <span className="hidden sm:block text-gray-400 mx-2">•</span>
            
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-gray-700 font-medium">Calm tools & rewards</span>
            </div>
            
            <span className="hidden sm:block text-gray-400 mx-2">•</span>
            
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span className="text-gray-700 font-medium">Progress auto-syncs to your plan</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onSetupNow}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <Zap className="w-4 h-4 mr-2" />
              Set up now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              onClick={onSkip}
              variant="outline"
              className="w-full font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:bg-gray-50"
            >
              Skip for now
            </Button>
          </div>

          {/* Reassurance */}
          <p className="text-xs text-muted-foreground mt-4 sm:mt-6 opacity-80">
            You can always set up Aminy Junior later from your profile or Junior tab.
          </p>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="aminy-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="w-20"></div> {/* Spacer to balance layout */}
        </div>
      </div>
    </div>
  );
};