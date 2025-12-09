import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createShop } from '../services/db';
import { useLogger } from '../context/LoggerContext';
import { Store, Phone, MapPin, CreditCard } from 'lucide-react';

const CreateShop = ({ onShopCreated }) => {
  const { user } = useAuth();
  const { addLog } = useLogger();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    whatsapp: '',
    location: '',
    alias: '',
    cbu: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      addLog('Creando tienda...', 'info');
      // Clean whatsapp number
      const cleanPhone = formData.whatsapp.replace(/[^0-9+]/g, '');
      
      const shopData = {
        ...formData,
        whatsapp: cleanPhone,
        alias: formData.alias.toUpperCase()
      };

      const shopId = await createShop(user.uid, shopData);
      addLog(`Tienda creada con éxito: ${shopId}`, 'success');
      if (onShopCreated) onShopCreated();
    } catch (error) {
      addLog(`Error creando tienda: ${error.message}`, 'error');
      alert('Error al crear la tienda. Revisa los logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-blue-600">
        <Store /> Configura tu Tienda
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Información Básica</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Tienda</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: Modas Claudia"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Corta</label>
            <textarea
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
              placeholder="Ropa americana de segunda mano..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Phone size={16}/> WhatsApp
              </label>
              <input
                type="tel"
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="+54 9 11 1234 5678"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin size={16}/> Ubicación
              </label>
              <input
                type="text"
                required
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej: Belgrano, CABA"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Payment Info Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <CreditCard size={20} /> Datos de Pago (Opcional)
          </h3>
          <p className="text-sm text-blue-600 mb-4">
            Estos datos se mostrarán a tus clientes para facilitar la transferencia.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alias (Mercado Pago / Banco)</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                value={formData.alias}
                onChange={e => setFormData({...formData, alias: e.target.value.toUpperCase()})}
                placeholder="Ej: MI.TIENDA.MP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVU / CBU (22 dígitos)</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.cbu}
                onChange={e => setFormData({...formData, cbu: e.target.value})}
                placeholder="000000..."
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg text-white font-bold shadow-md transition-colors ${
            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Creando Tienda...' : 'Abrir Mi Tienda'}
        </button>
      </form>
    </div>
  );
};

export default CreateShop;
