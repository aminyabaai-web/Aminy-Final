import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { 
  Calendar, Clock, Video, Shield, CheckCircle2, MessageCircle, 
  Plus, User, Edit3, AlertTriangle
} from 'lucide-react';
import { 
  SessionPrepModal, 
  AppointmentCard, 
  InsuranceStatusBanner 
} from './CareTabEnhancements';

interface EnhancedScheduleViewProps {
  userTier: string;
  isStarter: boolean;
  onPaywallTrigger?: () => void;
  mockAppointments: any[];
}

export const EnhancedScheduleView: React.FC<EnhancedScheduleViewProps> = ({
  userTier,
  isStarter,
  onPaywallTrigger,
  mockAppointments
}) => {
  const [showPreSessionChecklist, setShowPreSessionChecklist] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const handleRescheduleAppointment = (appointmentId: string) => {
    const appointment = mockAppointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    // Check reschedule deadline
    if (appointment.rescheduleDeadline) {
      const deadline = new Date(appointment.rescheduleDeadline);
      const now = new Date();
      
      if (now > deadline) {
        toast.error('Reschedule deadline has passed', {
          description: 'Please contact your provider directly for changes.'
        });
        return;
      }
    }

    setSelectedAppointmentId(appointmentId);
    setShowRescheduleModal(true);
  };

  const handleInsuranceVerification = (appointmentId: string) => {
    toast.loading('Verifying insurance coverage...', { duration: 2000 });
    
    setTimeout(() => {
      toast.success('Insurance verified', {
        description: 'Your session is fully covered with $25 copay.'
      });
    }, 2000);
  };

  const handleJoinSession = (appointmentId: string) => {
    const appointment = mockAppointments.find(apt => apt.id === appointmentId);
    
    // Check if session is starting soon
    const appointmentDate = new Date(appointment.date + 'T' + appointment.time.split(' - ')[0]);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const minutesUntil = Math.floor(timeDiff / (1000 * 60));

    if (minutesUntil > 15) {
      toast.info('Session starts in ' + minutesUntil + ' minutes', {
        description: 'You can join up to 15 minutes before your appointment.'
      });
      return;
    }

    toast.success('Joining session...', {
      description: 'Connecting you with your provider'
    });
  };

  if (isStarter) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Upgrade for Scheduling</h3>
          <p className="text-slate-600 mb-4">Access appointment scheduling with Core and Pro plans.</p>
          <Button onClick={onPaywallTrigger} className="bg-teal-600 hover:bg-teal-700 text-white">
            View Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Schedule</h2>
        <p className="text-slate-600">Manage your appointments and session bookings</p>
      </div>

      {/* Insurance Status Banner */}
      <InsuranceStatusBanner />

      <div className="space-y-3 sm:space-y-4">
        {mockAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onReschedule={() => handleRescheduleAppointment(appointment.id)}
            onPrepare={() => setShowPreSessionChecklist(true)}
            onJoinSession={() => handleJoinSession(appointment.id)}
          />
        ))}
        
        {/* Schedule New Session Card */}
        <Card className="p-6 border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <Calendar className="mx-auto h-8 w-8 text-slate-400 mb-3" />
            <h3 className="font-medium text-slate-900 mb-2">Schedule New Session</h3>
            <p className="text-sm text-slate-600 mb-4">
              Book your next session with Sarah Miller
            </p>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              View Available Times
            </Button>
          </div>
        </Card>
      </div>

      {/* Session Preparation Modal */}
      <SessionPrepModal
        isOpen={showPreSessionChecklist}
        onClose={() => setShowPreSessionChecklist(false)}
        providerName="Sarah Miller"
      />

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new time for your session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <p className="text-sm text-slate-600">
              Current appointment: Thursday, Dec 18 at 2:00 PM
            </p>
            
            {/* Available reschedule times */}
            <div className="space-y-2">
              <p className="font-medium text-slate-900">Available Times</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Dec 19, 10:00 AM', 'Dec 19, 2:00 PM', 'Dec 20, 9:00 AM', 'Dec 20, 3:00 PM'].map((time) => (
                  <Button
                    key={time}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRescheduleModal(false);
                      toast.success('Appointment rescheduled', {
                        description: `New time: ${time}`
                      });
                    }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setShowRescheduleModal(false);
                  toast.info('Reschedule request sent to provider');
                }}
                className="flex-1"
              >
                Request Custom Time
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedScheduleView;