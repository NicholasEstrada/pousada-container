
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Booking, Image, PousadaInfo, User } from '../types';
import { getBookings, getImages, getPousadaInfo, updateBooking, deleteImage, uploadImage, updatePousadaInfo, getUsers } from '../services/api';
import { CalendarIcon } from './icons/CalendarIcon';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserIcon } from './icons/UserIcon';


interface AdminDashboardProps {
  onDataUpdate: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState('bookings');
  const { token } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [pousadaInfo, setPousadaInfo] = useState<PousadaInfo | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [description, setDescription] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsData, imagesData, infoData, usersData] = await Promise.all([
        getBookings(),
        getImages(),
        getPousadaInfo(),
        token ? getUsers(token) : Promise.resolve([])
      ]);
      setBookings(bookingsData);
      setImages(imagesData);
      setPousadaInfo(infoData);
      setDescription(infoData.description);
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBooking || !token) return;
    try {
      await updateBooking(editingBooking.id, editingBooking, token);
      setEditingBooking(null);
      fetchData();
      onDataUpdate();
    } catch (error) {
      console.error("Failed to update booking", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && token) {
      const file = e.target.files[0];
      try {
        await uploadImage(file, token);
        fetchData();
        onDataUpdate();
      } catch (error) {
        console.error("Failed to upload image", error);
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta imagem?') && token) {
      try {
        await deleteImage(imageId, token);
        fetchData();
        onDataUpdate();
      } catch (error) {
        console.error("Failed to delete image", error);
      }
    }
  };
  
  const handleInfoUpdate = async () => {
    if (!pousadaInfo || !token) return;
    try {
      const updatedInfo = { ...pousadaInfo, description };
      await updatePousadaInfo(updatedInfo, token);
      alert("Informações atualizadas com sucesso!");
      fetchData();
      onDataUpdate();
    } catch (error) {
      console.error("Failed to update info", error);
      alert("Falha ao atualizar informações.");
    }
  };
  
  const findUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.email : 'Usuário não encontrado';
  };

  if (loading) return <div>Carregando painel...</div>;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg w-full">
      <h1 className="text-3xl font-bold text-teal-800 mb-6">Painel de Administração</h1>
      <div className="border-b border-stone-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('bookings')} className={`${activeTab === 'bookings' ? 'border-teal-500 text-teal-600' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Reservas</button>
          <button onClick={() => setActiveTab('gallery')} className={`${activeTab === 'gallery' ? 'border-teal-500 text-teal-600' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Galeria</button>
          <button onClick={() => setActiveTab('settings')} className={`${activeTab === 'settings' ? 'border-teal-500 text-teal-600' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Configurações</button>
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === 'bookings' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-stone-700">Gerenciar Reservas</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Check-in</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Check-out</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-stone-700">
                  {bookings.map(booking => (
                    <tr key={booking.id} className="border-b border-stone-200 hover:bg-stone-50">
                      <td className="py-3 px-4">{findUserEmail(booking.usuario_id)}</td>
                      <td className="py-3 px-4">{new Date(booking.data_inicio + 'T00:00:00').toLocaleDateString()}</td>
                      <td className="py-3 px-4">{new Date(booking.data_fim + 'T00:00:00').toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => setEditingBooking(booking)} className="text-teal-600 hover:underline text-sm font-semibold">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'gallery' && (
           <div>
              <h2 className="text-xl font-semibold mb-4 text-stone-700">Gerenciar Galeria</h2>
              <div className="mb-6">
                <label htmlFor="image-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700">
                    <UploadIcon className="w-5 h-5 mr-2" />
                    Enviar Nova Imagem
                </label>
                <input id="image-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map(image => (
                    <div key={image.id} className="relative group">
                        <img src={image.url} alt={image.alt} className="rounded-lg object-cover w-full h-40" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <button onClick={() => handleDeleteImage(image.id)} className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                ))}
              </div>
           </div>
        )}
        {activeTab === 'settings' && (
           <div>
               <h2 className="text-xl font-semibold mb-4 text-stone-700">Configurações da Pousada</h2>
               <div>
                  <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">Descrição da Pousada</label>
                  <textarea 
                    id="description"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border-stone-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  />
               </div>
               <div className="mt-6 text-right">
                  <button onClick={handleInfoUpdate} className="bg-teal-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700">Salvar Alterações</button>
               </div>
           </div>
        )}
      </div>

      {editingBooking && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                 <h3 className="text-xl font-bold mb-4">Editar Reserva</h3>
                 <form onSubmit={handleUpdateBooking}>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm">Check-in</label>
                             <input type="date" value={editingBooking.data_inicio} onChange={e => setEditingBooking({...editingBooking, data_inicio: e.target.value})} className="w-full border-stone-300 rounded-md"/>
                         </div>
                         <div>
                             <label className="block text-sm">Check-out</label>
                             <input type="date" value={editingBooking.data_fim} onChange={e => setEditingBooking({...editingBooking, data_fim: e.target.value})} className="w-full border-stone-300 rounded-md"/>
                         </div>
                         <div>
                             <label className="block text-sm">Descrição</label>
                             <textarea value={editingBooking.descricao} onChange={e => setEditingBooking({...editingBooking, descricao: e.target.value})} className="w-full border-stone-300 rounded-md"/>
                         </div>
                     </div>
                     <div className="mt-6 flex justify-end space-x-3">
                         <button type="button" onClick={() => setEditingBooking(null)} className="py-2 px-4 border border-stone-300 rounded-md text-sm text-stone-700 hover:bg-stone-50">Cancelar</button>
                         <button type="submit" className="py-2 px-4 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700">Salvar</button>
                     </div>
                 </form>
             </div>
         </div>
      )}

    </div>
  );
};

export default AdminDashboard;
