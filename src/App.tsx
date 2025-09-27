
import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Header from './components/Header';
import Gallery from './components/Gallery';
import BookingCalendar from './components/BookingCalendar';
import LoginModal from './components/LoginModal';
import CreateBookingModal from './components/BookingModal';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import { PousadaInfo, Booking, Image } from './types';
import { getPousadaInfo, getBookings, getImages } from './services/api';

const App: React.FC = () => {
  const { user, role } = useAuth();
  const [view, setView] = useState<'home' | 'admin'>('home');

  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  
  const [pousadaInfo, setPousadaInfo] = useState<PousadaInfo | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [info, bookingsData, imagesData] = await Promise.all([
        getPousadaInfo(),
        getBookings(),
        getImages(),
      ]);
      setPousadaInfo(info);
      setBookings(bookingsData);
      setImages(imagesData);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookingSuccess = () => {
    setBookingModalOpen(false);
    fetchData(); // Refresh bookings
  };

  const handleDataUpdate = () => {
    fetchData(); // Refresh all data when admin makes a change
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="w-16 h-16 border-4 border-t-transparent border-teal-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header
        onLoginClick={() => setLoginModalOpen(true)}
        currentView={view}
        onViewChange={setView}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === 'home' ? (
          <>
            <section id="about" className="text-center mb-12">
              <h1 className="text-5xl font-bold text-teal-800 mb-2">Pousada Oásis</h1>
              <p className="text-lg text-stone-600 max-w-3xl mx-auto">{pousadaInfo?.description}</p>
            </section>
            
            <Gallery images={images} />
            
            <section id="reservations" className="mt-16 bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-3xl font-bold text-center text-teal-700 mb-6">Disponibilidade e Reservas</h2>
              <BookingCalendar bookings={bookings} />
              <div className="text-center mt-8">
                {user ? (
                   <button 
                     onClick={() => setBookingModalOpen(true)}
                     className="bg-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-teal-700 transition-transform transform hover:scale-105"
                   >
                     Fazer uma Reserva
                   </button>
                ) : (
                  <p className="text-stone-600">
                    Você precisa <button onClick={() => setLoginModalOpen(true)} className="text-teal-600 font-semibold hover:underline">fazer login</button> para realizar uma reserva.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : (
          role === 'admin' && <AdminDashboard onDataUpdate={handleDataUpdate} />
        )}
      </main>
      <Footer />
      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
      {isBookingModalOpen && user && (
        <CreateBookingModal 
          onClose={() => setBookingModalOpen(false)} 
          onBookingSuccess={handleBookingSuccess}
          bookedDates={bookings.flatMap(b => {
             const dates = [];
             let currentDate = new Date(b.data_inicio);
             const endDate = new Date(b.data_fim);
             while(currentDate <= endDate) {
                dates.push(new Date(currentDate).toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
             }
             return dates;
          })}
        />
      )}
    </div>
  );
};

export default App;
