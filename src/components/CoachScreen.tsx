// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { GlobalDisclaimer } from './GlobalDisclaimer';
import { 
  Calendar,
  MessageCircle,
  Users,
  Video,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface CoachScreenProps {
  title: string;
  subtitle: string;
  userTier: string | null;
  onBookSession?: () => void;
  onStartChat?: () => void;
}

export function CoachScreen({ title, subtitle, userTier, onBookSession, onStartChat }: CoachScreenProps) {
  return (
    <div className="min-h-screen bg-mist/30 pb-20">
      <div className="bg-white border-b border-[#E8E4DF] px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl" role="img" aria-hidden="true">
              👨‍⚕️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl text-primary font-medium">{title}</h1>
                {userTier === 'pro' && (
                  <Badge className="text-sm bg-purple-50 text-purple-700 border-purple-200">
                    Pro
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Coach Services Overview */}
          <Card className="p-6 aminy-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg text-primary font-semibold">Professional Coaching</h2>
                <p className="text-sm text-muted-foreground">
                  One-on-one guidance from certified developmental specialists
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Video className="w-5 h-5 text-purple-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Video Sessions</div>
                  <div className="text-sm text-muted-foreground">30-minute sessions with certified coaches</div>
                </div>
                <div className="text-sm font-medium text-purple-600">
                  {userTier === 'pro' ? '4/month' : '0/month'}
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-[#EEF4F8] rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Coach Chats</div>
                  <div className="text-sm text-muted-foreground">Text-based support and guidance</div>
                </div>
                <div className="text-sm font-medium text-blue-600">
                  {userTier === 'pro' ? '10/month' : '0/month'}
                </div>
              </div>
            </div>
          </Card>

          {/* Booking Actions */}
          <Card className="p-6 aminy-card">
            <h3 className="font-semibold text-primary mb-4">Schedule & Connect</h3>
            
            <div className="space-y-3">
              <Button
                onClick={() => {
                  onBookSession?.();
                }}
                className="w-full justify-between bg-purple-600 hover:bg-purple-700 text-white"
                disabled={userTier !== 'pro'}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Book Video Session
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => {
                  onStartChat?.();
                }}
                variant="outline"
                className="w-full justify-between"
                disabled={userTier !== 'pro'}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Start Coach Chat
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              {userTier !== 'pro' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-amber-700 font-medium">🔒 Pro Feature</span>
                  </div>
                  <p className="text-sm text-amber-600">
                    Upgrade to Pro to access professional coaching services with certified developmental specialists.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Session History */}
          {userTier === 'pro' && (
            <Card className="p-6 aminy-card">
              <h3 className="font-semibold text-primary mb-4">Recent Sessions</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">Strategy Review</div>
                      <div className="text-sm text-muted-foreground">Dec 8, 2024</div>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Book your first session to get started</p>
                </div>
              </div>
            </Card>
          )}

          {/* Coach Disclaimer */}
          <div className="mt-4 sm:mt-6">
            <GlobalDisclaimer variant="card" showIcon={true} />
          </div>
        </div>
      </div>
    </div>
  );
}