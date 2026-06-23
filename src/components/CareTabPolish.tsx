// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { 
  Calendar, Clock, Video, Phone, MapPin, Shield, CheckCircle2, 
  AlertCircle, Star, Upload, Camera, FileText, Paperclip,
  User, Settings, Bell, MessageSquare, ExternalLink, Copy,
  Trash2, Edit3, RotateCcw, Share, Download, Archive, Send
} from 'lucide-react';

// Medical-grade provider availability system
interface ProviderAvailability {
  providerId: string;
  date: string;
  slots: Array<{
    time: string;
    available: boolean;
    type: 'rbt_25' | 'rbt_50' | 'consultation';
    insuranceVerified: boolean;
  }>;
}

// Enhanced session preparation workflow
interface SessionPrepWorkflow {
  id: string;
  title: string;
  items: Array<{
    id: string;
    text: string;
    required: boolean;
    completed: boolean;
    category: 'preparation' | 'environment' | 'materials' | 'technical';
  }>;
  estimatedTime: number; // minutes
  completionRate: number;
}

// Professional message management
interface ThreadManagement {
  threadId: string;
  priority: 'routine' | 'important' | 'urgent';
  tags: string[];
  assignedProvider: string;
  lastReviewDate: Date;
  nextFollowUp?: Date;
  hasUnreadFromProvider: boolean;
  requiresAttention: boolean;
}

// Insurance verification workflow
interface InsuranceStatus {
  verified: boolean;
  provider: string;
  planType: string;
  copayAmount?: number;
  authorizationRequired: boolean;
  authorizationStatus?: 'pending' | 'approved' | 'denied';
  expirationDate?: Date;
}

interface CareTabPolishProps {
  userTier: string;
  childName: string;
  currentProvider?: {
    name: string;
    credentials: string[];
    specialty: string;
    availability: ProviderAvailability[];
  };
  sessionHistory?: Record<string, unknown>[];
  onScheduleSession?: (sessionData: { date: string; time: string }) => void;
  onMessageSent?: (message: { content: string; attachments: File[]; priority: 'routine' | 'important' | 'urgent' }) => void;
  onFileUploaded?: (file: File[]) => void;
}

export const CareTabPolish: React.FC<CareTabPolishProps> = ({
  userTier,
  childName,
  currentProvider,
  sessionHistory,
  onScheduleSession,
  onMessageSent,
  onFileUploaded
}) => {
  // Enhanced session preparation state
  const [sessionPrep, setSessionPrep] = useState<SessionPrepWorkflow>({
    id: 'prep-1',
    title: 'Session Preparation Checklist',
    items: [
      {
        id: '1',
        text: 'Review current care plan and session goals',
        required: true,
        completed: false,
        category: 'preparation'
      },
      {
        id: '2', 
        text: 'Prepare visual supports and intervention materials',
        required: true,
        completed: false,
        category: 'materials'
      },
      {
        id: '3',
        text: 'Set up distraction-free environment',
        required: true,
        completed: false,
        category: 'environment'
      },
      {
        id: '4',
        text: 'Test video connection and audio quality',
        required: true,
        completed: false,
        category: 'technical'
      },
      {
        id: '5',
        text: 'Have preferred reinforcers and motivators ready',
        required: false,
        completed: false,
        category: 'materials'
      },
      {
        id: '6',
        text: 'Prepare backup activities if needed',
        required: false,
        completed: false,
        category: 'preparation'
      }
    ],
    estimatedTime: 10,
    completionRate: 0
  });

  // Provider integration state
  const [showProviderCalendar, setShowProviderCalendar] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<{ date: string; time: string } | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus>({
    verified: true,
    provider: 'Aetna Better Health',
    planType: 'HMO',
    copayAmount: 25,
    authorizationRequired: false,
    authorizationStatus: 'approved'
  });

  // Session experience state
  const [showPostSessionModal, setShowPostSessionModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showPreSessionChecklist, setShowPreSessionChecklist] = useState(false);

  // Professional messaging state
  const [messageTemplate, setMessageTemplate] = useState('');
  const [quickReplies, setQuickReplies] = useState([
    'Thank you for the update!',
    'I have a question about...',
    'Could you share the session notes?',
    'When is our next appointment?'
  ]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [threadPriority, setThreadPriority] = useState<'routine' | 'important' | 'urgent'>('routine');

  // Update completion rate when items change
  useEffect(() => {
    const completedItems = sessionPrep.items.filter(item => item.completed).length;
    const totalItems = sessionPrep.items.length;
    const newRate = Math.round((completedItems / totalItems) * 100);
    
    setSessionPrep(prev => ({
      ...prev,
      completionRate: newRate
    }));
  }, [sessionPrep.items]);

  // Handler functions
  const handlePrepItemToggle = (itemId: string) => {
    setSessionPrep(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const handleScheduleAppointment = (appointmentData: { date: string; time: string }) => {
    // Enhanced appointment scheduling with insurance verification
    if (insuranceStatus.authorizationRequired && insuranceStatus.authorizationStatus !== 'approved') {
      toast.error('Prior authorization required', {
        description: 'Please contact your insurance provider first.'
      });
      return;
    }

    toast.success('Appointment scheduled successfully', {
      description: `Session with ${currentProvider?.name} confirmed`
    });
    
    onScheduleSession?.(appointmentData);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const uploadedFilesList = Array.from(files);
    setUploadedFiles(prev => [...prev, ...uploadedFilesList]);
    
    uploadedFilesList.forEach(file => {
      toast.success(`${file.name} uploaded`, {
        description: 'File will be shared in your next message'
      });
    });

    onFileUploaded?.(uploadedFilesList);
  };

  const handleSessionCompletion = () => {
    // Enhanced post-session workflow
    const sessionData = {
      notes: sessionNotes,
      rating: sessionRating,
      files: uploadedFiles,
      timestamp: new Date()
    };

    toast.success('Session completed successfully', {
      description: 'Notes and files have been saved to your records'
    });

    setShowPostSessionModal(false);
    setSessionNotes('');
    setSessionRating(0);
    setUploadedFiles([]);
  };

  // Render enhanced provider calendar
  const renderProviderCalendar = () => (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Schedule with {currentProvider?.name}</h3>
        <Badge variant="outline" className="text-sm">
          {insuranceStatus.verified ? '✓ Verified' : '⚠ Pending'}
        </Badge>
      </div>

      {/* Insurance status card */}
      <div className="mb-4 sm:mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">{insuranceStatus.provider}</p>
            <p className="text-sm text-green-700">{insuranceStatus.planType}</p>
          </div>
        </div>
        {insuranceStatus.copayAmount && (
          <p className="text-sm text-green-700">Copay: ${insuranceStatus.copayAmount}</p>
        )}
      </div>

      {/* Available appointment slots */}
      <div className="space-y-3">
        <h4 className="font-medium text-[#1B2733]">Available Times</h4>
        {['2024-12-18', '2024-12-19', '2024-12-20'].map((date) => (
          <div key={date} className="border rounded-lg p-4">
            <h5 className="font-medium mb-2">{new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['9:00 AM', '10:30 AM', '2:00 PM', '3:30 PM'].map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  size="sm"
                  onClick={() => handleScheduleAppointment({ date, time })}
                  className="justify-center"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  // Render enhanced session preparation
  const renderSessionPrep = () => (
    <Dialog open={showPreSessionChecklist} onOpenChange={setShowPreSessionChecklist}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#6B9080]" />
            Session Preparation
          </DialogTitle>
          <DialogDescription>
            Complete these items before your session with {currentProvider?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Completion progress */}
          <div className="bg-[#FAF7F2] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Preparation Progress</span>
              <span className="text-sm text-[#5A6B7A]">{sessionPrep.completionRate}% Complete</span>
            </div>
            <div className="w-full bg-[#E8E4DF] rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${sessionPrep.completionRate}%` }}
              />
            </div>
          </div>

          {/* Checklist items by category */}
          {['preparation', 'materials', 'environment', 'technical'].map((category) => {
            const categoryItems = sessionPrep.items.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-[#1B2733] capitalize">
                  {category === 'preparation' ? 'Session Preparation' : category}
                </h4>
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handlePrepItemToggle(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span className={`${item.completed ? 'line-through text-[#5A6B7A]' : 'text-[#1B2733]'} ${item.required ? 'font-medium' : ''}`}>
                          {item.text}
                        </span>
                        {item.required && (
                          <Badge variant="secondary" className="ml-2 text-sm">Required</Badge>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Estimated time */}
          <div className="flex items-center gap-2 text-sm text-[#5A6B7A]">
            <Clock className="h-4 w-4" />
            <span>Estimated preparation time: ~{sessionPrep.estimatedTime} minutes</span>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreSessionChecklist(false)}>
              Save Progress
            </Button>
            <Button 
              onClick={() => {
                setShowPreSessionChecklist(false);
                toast.success('Ready for session!');
              }}
              disabled={sessionPrep.completionRate < 100}
            >
              Mark as Ready
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render post-session capture
  const renderPostSessionModal = () => (
    <Dialog open={showPostSessionModal} onOpenChange={setShowPostSessionModal}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Session Complete
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing your session experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Session rating */}
          <div>
            <label className="block text-sm font-medium mb-2">How was today's session?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSessionRating(rating)}
                  className={`p-2 rounded-lg transition-colors ${
                    sessionRating >= rating
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-[#F0EDE8] text-slate-400 hover:bg-[#E8E4DF]'
                  }`}
                >
                  <Star className={`h-5 w-5 ${sessionRating >= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Session notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Session Notes (Optional)</label>
            <Textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="How did the session go? Any highlights or concerns to share with your provider?"
              className="min-h-[100px]"
            />
          </div>

          {/* File upload section */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Session Materials</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="session-file-upload"
              />
              <label htmlFor="session-file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-[#5A6B7A] mb-1">Upload photos, videos, or documents</p>
                <p className="text-sm text-[#5A6B7A]">PDF, DOC, JPG, PNG, MP4 up to 50MB</p>
              </label>
            </div>
            
            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-[#FAF7F2] rounded">
                    <FileText className="h-4 w-4 text-[#5A6B7A]" />
                    <span className="text-sm text-[#3A4A57] flex-1">{file.name}</span>
                    <button
                      onClick={() => {
                        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="text-slate-400 hover:text-[#5A6B7A]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPostSessionModal(false)}>
              Skip for Now
            </Button>
            <Button onClick={handleSessionCompletion}>
              Complete Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render enhanced provider info card
  const renderProviderInfoCard = () => (
    <Card className="p-4 mb-4 bg-gradient-to-r from-[#FAF7F2] to-cyan-50 border-[#6B9080]/20">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-[#6B9080]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#6B9080]">{currentProvider?.name || 'Sarah Miller'}</h3>
            <div className="flex items-center gap-2 mb-1">
              {(currentProvider?.credentials || ['RBT']).map((credential) => (
                <Badge key={credential} variant="secondary" className="text-sm">
                  {credential}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-[#6B9080]">{currentProvider?.specialty || 'Registered Behavior Technician'}</p>
            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-sm text-[#6B9080]">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Available today
              </span>
              <span>Avg response: 2-4 hours</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowProviderCalendar(true)}>
            <Calendar className="h-4 w-4 mr-1" />
            Schedule
          </Button>
          <Button size="sm" variant="outline">
            <Video className="h-4 w-4 mr-1" />
            Start Call
          </Button>
        </div>
      </div>
    </Card>
  );

  // Render enhanced message composer
  const renderEnhancedComposer = () => (
    <div className="border-t border-[#E8E4DF] p-4 bg-white">
      {/* Quick reply suggestions */}
      <div className="mb-3 flex flex-wrap gap-2">
        {quickReplies.map((reply, index) => (
          <Button
            key={index}
            size="sm"
            variant="outline"
            onClick={() => setMessageTemplate(reply)}
            className="text-sm"
          >
            {reply}
          </Button>
        ))}
      </div>

      {/* Enhanced composer */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder="Type your message to your provider..."
            className="min-h-[80px] resize-none"
          />
          
          {/* File attachments */}
          {uploadedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-[#F0EDE8] rounded text-sm">
                  <Paperclip className="h-3 w-3" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    className="text-slate-400 hover:text-[#5A6B7A]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="message-file-upload"
          />
          <label htmlFor="message-file-upload">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
              <Paperclip className="h-4 w-4" />
            </span>
          </label>
          
          <Button 
            size="sm"
            onClick={() => {
              onMessageSent?.({
                content: messageTemplate,
                attachments: uploadedFiles,
                priority: threadPriority
              });
              setMessageTemplate('');
              setUploadedFiles([]);
              toast.success('Message sent');
            }}
            disabled={!messageTemplate.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Render appointment management
  const renderAppointmentManagement = () => (
    <Card className="p-4 sm:p-5 md:p-6">
      <h3 className="text-lg font-semibold mb-4">Upcoming Appointments</h3>
      
      <div className="space-y-3 sm:space-y-4">
        {/* Next appointment */}
        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-[#C8DDE8]">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-blue-900">50-min Comprehensive Session</h4>
              <div className="flex items-center gap-3 sm:gap-4 mt-1 text-sm text-blue-700">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Thursday, Dec 18
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  2:00 PM - 2:50 PM
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                Focus on communication goals and social skills development
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => setShowPreSessionChecklist(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Prepare
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowRescheduleModal(true)}>
                <Calendar className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
            </div>
          </div>
        </div>

        {/* Session preparation status */}
        <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${sessionPrep.completionRate === 100 ? 'text-green-500' : 'text-slate-400'}`} />
            <span className="text-sm font-medium">
              Session Preparation {sessionPrep.completionRate === 100 ? 'Complete' : 'Pending'}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowPreSessionChecklist(true)}>
            {sessionPrep.completionRate === 100 ? 'Review' : 'Complete'}
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Provider info card */}
      {renderProviderInfoCard()}
      
      {/* Appointment management */}
      {renderAppointmentManagement()}
      
      {/* Enhanced message composer */}
      {renderEnhancedComposer()}

      {/* Provider calendar modal */}
      <Dialog open={showProviderCalendar} onOpenChange={setShowProviderCalendar}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              Select an available time with your provider
            </DialogDescription>
          </DialogHeader>
          {renderProviderCalendar()}
        </DialogContent>
      </Dialog>

      {/* Reschedule modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new time for your session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-sm text-[#5A6B7A]">
              Current appointment: Thursday, Dec 18 at 2:00 PM
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => {
                setShowRescheduleModal(false);
                toast.success('Reschedule request sent to provider');
              }}>
                Request Reschedule
              </Button>
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
                Keep Current Time
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session preparation modal */}
      {renderSessionPrep()}
      
      {/* Post-session modal */}
      {renderPostSessionModal()}
    </div>
  );
};

export default CareTabPolish;