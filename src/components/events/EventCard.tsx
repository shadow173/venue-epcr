// src/components/events/EventCard.tsx
import Link from 'next/link';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  id: string;
  name: string;
  venue: string;
  address: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  staffCount: number;
  patientCount: number;
}

export default function EventCard({
  id,
  name,
  venue,
  address,
  date,
  timeStart,
  timeEnd,
  staffCount,
  patientCount
}: EventCardProps) {
  // Format the date
  const formattedDate = format(new Date(date), 'MMMM d, yyyy');
  
  return (
    <Link href={`/events/${id}`}>
      <div className="h-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg dark:hover:shadow-gray-900/30">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
        <p className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400">{venue}</p>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="mr-2 h-4 w-4" />
            <span>{address}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="mr-2 h-4 w-4" />
            <span>{timeStart} - {timeEnd}</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{staffCount} Staff</span>
          </div>
          
          <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {patientCount} Patients
          </div>
        </div>
      </div>
    </Link>
  );
}