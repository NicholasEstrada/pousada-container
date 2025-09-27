import { useState, useEffect } from 'react';
// import { useAuth } from '../hooks/useAuth'; // Não é mais necessário para o token
import { createBooking, getPousadaInfo, updateUserProfile } from '../services/api'; // Importamos a nova função
import { XIcon } from './icons/XIcon';
import { PousadaInfo } from '../types';

interface CreateBookingModalProps {
  // A prop 'userId' foi removida. A API pega o ID do usuário logado.
  onClose: () => void;
  onBookingSuccess: () => void;
  bookedDates: string[]; // YYYY-MM-DD
}

// Função de formatação que criamos anteriormente
const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 3) return `(${phoneNumber}`;
  if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};


const CreateBookingModal: React.FC<CreateBookingModalProps> = ({ onClose, onBookingSuccess, bookedDates }) => {
  // const { token } = useAuth(); // Removido. O cliente Supabase gerencia a sessão.
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [descricao, setDescricao] = useState('');
  const [opcoes, setOpcoes] = useState<{ [key: string]: boolean }>({});
  
  // <<< NOVO ESTADO PARA O TELEFONE >>>
  const [phoneNumber, setPhoneNumber] = useState('');

  const [pousadaOptions, setPousadaOptions] = useState<PousadaInfo['options']>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const info = await getPousadaInfo();
        setPousadaOptions(info.options);
        const initialOpcoes: {[key: string]: boolean} = {};
        info.options.forEach(opt => initialOpcoes[opt.id] = false);
        setOpcoes(initialOpcoes);
      } catch (err) {
        console.error("Falha ao buscar opções da pousada", err);
        setError("Não foi possível carregar as opções. Tente novamente.");
      }
    };
    fetchOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- VALIDAÇÃO ---
    if (!dataInicio || !dataFim) {
      setError('Por favor, selecione as datas de início e fim.');
      return;
    }

    // <<< VALIDAÇÃO DO TELEFONE >>>
    const phoneRegex = /^\(\d{2}\)\s\d{5}-\d{4}$/; // Regex para (xx) xxxxx-xxxx
    if (!phoneRegex.test(phoneNumber)) {
      setError('Por favor, insira um número de celular válido no formato (xx) xxxxx-xxxx.');
      return;
    }

    const startDate = new Date(dataInicio);
    const endDate = new Date(dataFim);
    if (endDate <= startDate) {
      setError('A data de fim deve ser posterior à data de início.');
      return;
    }

    // Checagem de sobreposição de datas
    let currentDate = new Date(startDate);
    while (currentDate < endDate) { // A checagem deve ser até a véspera do checkout
      const dateString = currentDate.toISOString().split('T')[0];
      if (bookedDates.includes(dateString)) {
        setError(`A data ${currentDate.toLocaleDateString()} já está reservada.`);
        return;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setIsSubmitting(true);
    try {
      // A verificação do token foi removida. Se o usuário não estiver logado,
      // a própria função da API (que chama supabase.auth.getUser()) lançará um erro.
      
      // 1. Cria a reserva. A função createBooking não precisa mais do token.
      await createBooking({
        data_inicio: dataInicio,
        data_fim: dataFim,
        descricao,
        opcoes,
      });

      // 2. Se a reserva for bem-sucedida, atualiza o perfil com o telefone
      await updateUserProfile({ phone_number: phoneNumber });
      
      onBookingSuccess();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar a reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionChange = (optionId: string) => {
    setOpcoes(prev => ({ ...prev, [optionId]: !prev[optionId] }));
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhoneNumber = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedPhoneNumber);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-stone-800">
          <XIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-teal-700 mb-6">Nova Reserva</h2>
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="data_inicio" className="block text-sm font-medium text-stone-600">Check-in</label>
              <input
                type="date"
                id="data_inicio"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full border-stone-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label htmlFor="data_fim" className="block text-sm font-medium text-stone-600">Check-out</label>
              <input
                type="date"
                id="data_fim"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                min={dataInicio || new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full border-stone-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-stone-600">Celular para Contato</label>
            <input
              type="tel"
              id="phone_number"
              value={phoneNumber}
              onChange={handlePhoneChange}
              maxLength={15}
              placeholder="(xx) xxxxx-xxxx"
              className="mt-1 block w-full border-stone-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-stone-600">Observações (opcional)</label>
            <textarea
              id="descricao"
              rows={3}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Alergia a glúten, preferência de quarto, etc."
              className="mt-1 block w-full border-stone-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Opções Adicionais</label>
            <div className="space-y-2">
              {pousadaOptions.map(option => (
                <label key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={opcoes[option.id] || false}
                    onChange={() => handleOptionChange(option.id)}
                    className="h-4 w-4 text-teal-600 border-stone-300 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-stone-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 py-2 px-4 border border-stone-300 rounded-md shadow-sm text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300"
            >
              {isSubmitting ? 'Reservando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBookingModal;
