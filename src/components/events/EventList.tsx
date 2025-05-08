// src/components/events/EventList.tsx
import EventCard from './EventCard';

export default async function EventList() {
  // In a real implementation, this would fetch from your API
  const events = [
    {
      id: '1',
      name: 'NYC Marathon 2023',
      venue: 'Central Park',
      address: 'Central Park, New York, NY',
      date: '2023-11-05',
      timeStart: '8:00 AM',
      timeEnd: '4:00 PM',
      staffCount: 12,
      patientCount: 24
    },
    {
      id: '2',
      name: 'Summer Street Festival',
      venue: 'Downtown Plaza',
      address: '123 Main St, New York, NY',
      date: '2023-07-15',
      timeStart: '10:00 AM',
      timeEnd: '8:00 PM',
      staffCount: 8,
      patientCount: 15
    },
    {
      id: '3',
      name: 'High School Football Game',
      venue: 'Lincoln High School',
      address: '555 Park Ave, Queens, NY',
      date: '2023-10-12',
      timeStart: '7:00 PM',
      timeEnd: '10:00 PM',
      staffCount: 4,
      patientCount: 3
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          name={event.name}
          venue={event.venue}
          address={event.address}
          date={event.date}
          timeStart={event.timeStart}
          timeEnd={event.timeEnd}
          staffCount={event.staffCount}
          patientCount={event.patientCount}
        />
      ))}
    </div>
  );
}