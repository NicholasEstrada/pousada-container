
import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface BookingCalendarProps {
  bookings: Booking[];
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ bookings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const bookedDates = useMemo(() => {
    const dates = new Set<string>();
    bookings.forEach(booking => {
      let d = new Date(booking.data_inicio + 'T00:00:00');
      const endDate = new Date(booking.data_fim + 'T00:00:00');
      while (d <= endDate) {
        dates.add(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }
    });
    return dates;
  }, [bookings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = [];
  for (let date = 1; date <= lastDayOfMonth.getDate(); date++) {
    daysInMonth.push(new Date(year, month, date));
  }
  
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-stone-200">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-semibold text-stone-700">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-stone-200">
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {weekDays.map(day => (
          <div key={day} className="font-bold text-stone-500 text-sm">{day}</div>
        ))}
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`}></div>
        ))}
        {daysInMonth.map(day => {
          const dayString = day.toISOString().split('T')[0];
          const isBooked = bookedDates.has(dayString);
          const isPast = day < new Date(new Date().toDateString());

          return (
            <div
              key={dayString}
              className={`p-2 rounded-full w-10 h-10 flex items-center justify-center mx-auto ${
                isBooked ? 'bg-red-300 text-red-800' : 
                isPast ? 'text-stone-400' : 'bg-green-100 text-green-800'
              }`}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
       <div className="flex justify-center items-center space-x-6 mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-100 border border-green-300"></div>
            <span className="text-sm text-stone-600">Disponível</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-300 border border-red-400"></div>
            <span className="text-sm text-stone-600">Ocupado</span>
          </div>
           <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-white border border-stone-400"></div>
            <span className="text-sm text-stone-500">Passado</span>
          </div>
        </div>
    </div>
  );
};

export default BookingCalendar;
