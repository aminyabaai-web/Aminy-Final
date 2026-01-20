import React, { useState } from 'react';
import { ArrowLeft, Shield, CreditCard, Trash2, AlertCircle, Lock, Eye, EyeOff, LogOut, Palette } from 'lucide-react';
import { ThemeSelector } from '../lib/theme-provider';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface SettingsScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export function SettingsScreen({ onBack, onLogout }: SettingsScreenProps) {
  const [hasInsurance] = useState(true); // This would come from user data
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInsuranceDetails, setShowInsuranceDetails] = useState(false);

  const handleManageInsurance = () => {
    setShowInsuranceDetails(!showInsuranceDetails);
  };

  const handleDeleteInsurance = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    toast.success('Insurance information deleted');
    setShowDeleteDialog(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account and privacy
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Privacy Section */}
        <div>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Privacy & Data
          </h2>

          {/* Insurance Information Card */}
          <Card className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">Insurance Information</h3>
                {hasInsurance ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Your insurance information is encrypted and secure
                    </p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mb-3">
                      Coverage on file
                    </Badge>

                    {showInsuranceDetails && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Plan name:</span>
                          <span className="text-xs font-medium">Blue Cross Blue Shield</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Member ID:</span>
                          <span className="text-xs font-medium">••••••6789</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Group ID:</span>
                          <span className="text-xs font-medium">GRP123</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">State:</span>
                          <span className="text-xs font-medium">CA</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManageInsurance}
                      >
                        {showInsuranceDetails ? (
                          <>
                            <EyeOff className="w-3 h-3 mr-1.5" />
                            Hide details
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 mr-1.5" />
                            View details
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleDeleteInsurance}
                      >
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        Delete insurance info
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      No insurance information on file
                    </p>
                    <Button variant="outline" size="sm">
                      Add insurance
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Data Security Notice */}
          <Card className="p-4 mt-4 bg-accent/5 border-accent/20">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-accent mt-0.5" />
              <div>
                <p className="text-xs text-slate-700">
                  All your personal and insurance data is encrypted end-to-end and stored securely. 
                  We never share your information without your explicit consent.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Appearance Section */}
        <div>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-accent" />
            Appearance
          </h2>
          <Card className="p-4">
            <ThemeSelector />
          </Card>
        </div>

        {/* Account Section */}
        <div>
          <h2 className="font-semibold mb-4">Account</h2>
          <Card className="p-4">
            <div className="space-y-3">
              <button className="w-full text-left text-sm py-2 hover:text-accent transition-colors">
                Email preferences
              </button>
              <button className="w-full text-left text-sm py-2 hover:text-accent transition-colors">
                Notification settings
              </button>
              <button className="w-full text-left text-sm py-2 hover:text-accent transition-colors">
                Subscription & billing
              </button>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <button 
                  onClick={onLogout}
                  className="w-full text-left text-sm py-2 hover:text-red-600 transition-colors flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Delete Insurance Information?</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. Your insurance information will be permanently deleted, 
                  and you'll need to re-enter it if you want to use Benefits Navigator features.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete permanently
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
