import React from 'react';
import { Activity, FlaskConical, Stethoscope, BriefcaseMedical, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineEvent {
  id: string | number;
  type: 'consultation' | 'laboratory' | 'hospitalization' | 'nursing';
  date: string;
  doctor: string;
  title: string;
  description: string;
  status: string;
}

interface PatientHistoryTimelineProps {
  events: TimelineEvent[];
}

export default function PatientHistoryTimeline({ events }: PatientHistoryTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Aucun historique médical trouvé pour ce patient.</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="h-5 w-5" />;
      case 'laboratory': return <FlaskConical className="h-5 w-5" />;
      case 'hospitalization': return <BriefcaseMedical className="h-5 w-5" />;
      case 'nursing': return <Activity className="h-5 w-5" />;
      default: return <CalendarIcon className="h-5 w-5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'laboratory': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'hospitalization': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'nursing': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-8 pb-4">
      {events.map((event, index) => (
        <div key={`${event.type}-${event.id}-${index}`} className="relative pl-6 sm:pl-8">
          {/* Timeline Dot/Icon */}
          <div className={`absolute -left-[17px] sm:-left-[21px] flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 bg-white ${getColor(event.type)}`}>
            {getIcon(event.type)}
          </div>

          {/* Content Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                  Dr. {event.doctor}
                </p>
              </div>
              <span className="inline-block whitespace-nowrap text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {format(parseISO(event.date), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
              {event.description}
            </p>
            {event.status && (
              <div className="mt-3">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  event.status.toLowerCase().includes('terminé') || event.status.toLowerCase().includes('clôturé') 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : event.status.toLowerCase().includes('annulé') 
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {event.status}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
