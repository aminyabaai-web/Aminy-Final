// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { 
  Calendar, Clock, Video, Shield, CheckCircle2, Star, Upload, 
  FileText, User, Paperclip, Edit3, MessageCircle, Plus, Trash2
} from 'lucide-react';

// Enhanced Session Preparation Modal
export const SessionPrepModal = ({ 
  isOpen, 
  onClose, 
  providerName = 'your provider' 
}: {
  isOpen: boolean;
  onClose: () => void;
  providerName?: string;
}) => {
  const [prepItems, setPrepItems] = useState([
    { id: '1', text: 'Review current care plan and session goals', completed: false, required: true },
    { id: '2', text: 'Prepare visual supports and intervention materials', completed: false, required: true },
    { id: '3', text: 'Set up distraction-free environment', completed: false, required: true },
    { id: '4', text: 'Test video connection and audio quality', completed: false, required: true },
    { id: '5', text: 'Have preferred reinforcers ready', completed: false, required: false },
    { id: '6', text: 'Prepare backup activities if needed', completed: false, required: false }
  ]);

  const completedCount = prepItems.filter(item => item.completed).length;
  const completionRate = Math.round((completedCount / prepItems.length) * 100);
  const requiredCompleted = prepItems.filter(item => item.required && item.completed).length;
  const requiredTotal = prepItems.filter(item => item.required).length;

  const handleToggle = (itemId: string) => {
    setPrepItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#6B9080]" />
            Session Preparation
          </DialogTitle>
          <DialogDescription>
            Complete these items before your session with {providerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Progress indicator */}
          <Card className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-[#6B9080]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-teal-900">Preparation Progress</span>
              <span className="text-sm text-[#6B9080]">{completionRate}% Complete</span>
            </div>
            <div className="w-full bg-[#6B9080]/20 rounded-full h-2 mb-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-sm text-[#6B9080]">
              {requiredCompleted}/{requiredTotal} required items completed
            </p>
          </Card>

          {/* Checklist */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">Preparation Checklist</h4>
            {prepItems.map((item) => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggle(item.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className={`${item.completed ? 'line-through text-slate-500' : 'text-slate-900'} ${item.required ? 'font-medium' : ''}`}>
                    {item.text}
                  </span>
                  {item.required && (
                    <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Save Progress
            </Button>
            <Button 
              onClick={() => {
                onClose();
                toast.success('Ready for session!');
              }}
              disabled={requiredCompleted < requiredTotal}
              className="bg-primary hover:bg-[#6B9080]"
            >
              Mark as Ready
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Provider Info Card
export const ProviderInfoCard = ({ 
  provider = {
    name: 'Sarah Miller',
    credentials: ['RBT'],
    specialty: 'Registered Behavior Technician',
    availability: 'Available today'
  },
  onSchedule,
  onStartCall
}: {
  provider?: { name: string; credentials: string[]; specialty: string; availability: string };
  onSchedule?: () => void;
  onStartCall?: () => void;
}) => (
  <Card className="p-4 mb-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-[#6B9080]/20">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-[#6B9080]/10 rounded-full flex items-center justify-center">
          <User className="h-6 w-6 text-[#6B9080]" />
        </div>
        <div>
          <h3 className="font-semibold text-teal-900">{provider.name}</h3>
          <div className="flex items-center gap-2 mb-1">
            {provider.credentials.map((credential: string) => (
              <Badge key={credential} variant="secondary" className="text-xs">
                {credential}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-[#6B9080]">{provider.specialty}</p>
          <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-[#6B9080]">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {provider.availability}
            </span>
            <span>Avg response: 2-4 hours</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="outline" onClick={onSchedule}>
          <Calendar className="h-4 w-4 mr-1" />
          Schedule
        </Button>
        <Button size="sm" variant="outline" onClick={onStartCall}>
          <Video className="h-4 w-4 mr-1" />
          Start Call
        </Button>
      </div>
    </div>
  </Card>
);

// Enhanced Appointment Card
export const AppointmentCard = ({ 
  appointment,
  onReschedule,
  onPrepare,
  onJoinSession
}: {
  appointment: { title: string; status: string; date: string; time: string; provider: string; copay?: number; notes: string; canReschedule?: boolean };
  onReschedule?: () => void;
  onPrepare?: () => void;
  onJoinSession?: () => void;
}) => (
  <Card className={`p-4 transition-all hover:shadow-md ${
    appointment.status === 'pending_insurance' ? 'border-amber-200 bg-amber-50' : 
    appointment.status === 'confirmed' ? 'border-emerald-200 bg-emerald-50' : 
    'border-slate-200 bg-white'
  }`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-slate-900">{appointment.title}</h3>
          <Badge className={`${
            appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
            appointment.status === 'pending_insurance' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {appointment.status === 'confirmed' ? '✓ Confirmed' : 
             appointment.status === 'pending_insurance' ? '⏳ Pending Insurance' : 
             'Pending'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 mt-1 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(appointment.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {appointment.time}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {appointment.provider}
          </span>
        </div>
        
        {appointment.copay !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span className="text-slate-600">Copay:</span>
            <span className="font-medium text-slate-900">
              {appointment.copay === 0 ? 'Fully Covered' : `$${appointment.copay}`}
            </span>
          </div>
        )}
        
        <p className="text-sm text-slate-600 mt-2">{appointment.notes}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2 flex-wrap">
      {appointment.status === 'confirmed' && (
        <>
          <Button size="sm" className="bg-primary hover:bg-[#6B9080]" onClick={onJoinSession}>
            <Video className="h-3 w-3 mr-1" />
            Join Session
          </Button>
          <Button size="sm" variant="outline" onClick={onPrepare}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Prepare
          </Button>
        </>
      )}
      
      {appointment.canReschedule && (
        <Button size="sm" variant="outline" onClick={onReschedule}>
          <Calendar className="h-3 w-3 mr-1" />
          Reschedule
        </Button>
      )}
      
      <Button size="sm" variant="outline">
        <MessageCircle className="h-3 w-3 mr-1" />
        Message Provider
      </Button>
    </div>
  </Card>
);

// Post-Session Feedback Modal
export const PostSessionModal = ({ 
  isOpen, 
  onClose 
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const handleSubmit = () => {
    toast.success('Session feedback submitted', {
      description: 'Thank you for your feedback!'
    });
    onClose();
    setRating(0);
    setNotes('');
    setUploadedFiles([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">How was today's session?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((starRating) => (
                <button
                  key={starRating}
                  onClick={() => setRating(starRating)}
                  className={`p-2 rounded-lg transition-colors ${
                    rating >= starRating
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Star className={`h-5 w-5 ${rating >= starRating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Session Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the session go? Any highlights or concerns to share with your provider?"
              className="min-h-[100px]"
            />
          </div>

          {/* File upload */}
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
                <p className="text-sm text-slate-600 mb-1">Upload photos, videos, or documents</p>
                <p className="text-xs text-slate-500">PDF, DOC, JPG, PNG, MP4 up to 50MB</p>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-700 flex-1">{file.name}</span>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Skip for Now
            </Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-[#6B9080]">
              Complete Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Insurance Status Banner
export const InsuranceStatusBanner = ({ 
  status = 'verified',
  provider = 'Aetna Better Health',
  planType = 'HMO'
}: {
  status?: 'verified' | 'pending' | 'expired';
  provider?: string;
  planType?: string;
}) => (
  <Card className={`p-4 mb-4 sm:mb-6 ${
    status === 'verified' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' :
    status === 'pending' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' :
    'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
  }`}>
    <div className="flex items-center gap-3">
      <Shield className={`h-5 w-5 ${
        status === 'verified' ? 'text-emerald-600' :
        status === 'pending' ? 'text-amber-600' :
        'text-red-600'
      }`} />
      <div className="flex-1">
        <p className={`font-medium ${
          status === 'verified' ? 'text-emerald-900' :
          status === 'pending' ? 'text-amber-900' :
          'text-red-900'
        }`}>
          Insurance {status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Expired'}
        </p>
        <p className={`text-sm ${
          status === 'verified' ? 'text-emerald-700' :
          status === 'pending' ? 'text-amber-700' :
          'text-red-700'
        }`}>
          {provider} • {planType} Plan
        </p>
      </div>
      <Badge className={`${
        status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
        status === 'pending' ? 'bg-amber-100 text-amber-700' :
        'bg-red-100 text-red-700'
      }`}>
        {status === 'verified' ? 'Active' : status === 'pending' ? 'Pending' : 'Action Required'}
      </Badge>
    </div>
  </Card>
);

export default {
  SessionPrepModal,
  ProviderInfoCard,
  AppointmentCard,
  PostSessionModal,
  InsuranceStatusBanner
};