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

    if (formData.name.length < 4 || formData.name.length > 20) {
      alert("El nombre de la tienda debe tener entre 4 y 20 caracteres.");
      return;
    }

    if (formData.cbu && formData.cbu.length !== 22) {
      alert("El CBU/CVU debe tener exactamente 22 números.");
      return;
    }

    setLoading(true);
    try {
      addLog('Creando tienda...', 'info');
      const cleanPhone = formData.whatsapp.replace(/[^0-9+]/g, '');
      
      const shopData = {
        ...formData,
        whatsapp: cleanPhone,
        alias: formData.alias.toUpperCase()
      };

      await createShop(user.uid, shopData);
      addLog(`Tienda creada con éxito`, 'success');
      if (onShopCreated) onShopCreated();
    } catch (error) {
      addLog(`Error creando tienda: ${error.message}`, 'error');
      alert('Error al crear la tienda. Revisa los logs.');
    } finally {
      setLoading(false);
    }
  };

  // Estilos base optimizados para móvil (text-base en inputs para evitar zoom en iOS)
  const inputClass = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A99CB] focus:border-[#5A99CB] outline-none transition-all text-base bg-gray-50 focus:bg-white";
  const labelClass = "block text-sm font-bold text-[#252D61] mb-1.5";

  return (
    <div className="w-full max-w-2xl mx-auto bg-white md:p-8 p-5 rounded-xl shadow-lg border-t-4 border-[#75D2C1]">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[#252D61]">
        <Store className="text-[#75D2C1]" size={28} /> Configura tu Tienda
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección Información Básica */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-400 border-b pb-2 uppercase tracking-wide text-xs">Información Básica</h3>
          
          <div>
            <label className={labelClass}>Nombre de la Tienda</label>
            <input
              type="text"
              required
              minLength={4}
              maxLength={20}
              className={inputClass}
              placeholder="Ej: Modas Claudia"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <p className="mt-1.5 text-xs text-gray-400 flex justify-between">
              <span>Entre 4 y 20 caracteres.</span>
              <span className={formData.name.length > 20 ? "text-red-500" : ""}>{formData.name.length}/20</span>
            </p>
          </div>

          <div>
            <label className={labelClass}>Descripción Corta</label>
            <textarea
              className={`${inputClass} resize-none h-24`}
              placeholder="¿Qué vendes? Ej: Ropa americana..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={`${labelClass} flex items-center gap-1`}>
                <Phone size={16} className="text-[#5A99CB]"/> WhatsApp
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none bg-gray-100 rounded-l-lg border-r border-gray-300 px-3">
                  <span className="text-gray-500 text-sm font-bold">+54 9</span>
                </div>
                <input
                  type="tel"
                  required
                  className={`${inputClass} pl-[5.5rem]`} // Padding extra para el prefijo
                  placeholder="11 1234 5678"
                  value={formData.whatsapp}
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Ingresa tu número sin 0 ni 15.</p>
            </div>

            <div>
              <label className={`${labelClass} flex items-center gap-1`}>
                <MapPin size={16} className="text-[#5A99CB]"/> Ubicación
              </label>
              <input
                type="text"
                required
                className={inputClass}
                placeholder="Ej: Belgrano, CABA"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Sección Datos de Pago */}
        <div className="bg-[#252D61]/5 p-5 rounded-xl border border-[#252D61]/10 mt-8">
          <h3 className="text-base font-bold text-[#252D61] mb-2 flex items-center gap-2">
            <CreditCard size={20} className="text-[#5A99CB]" /> Datos de Pago (Opcional)
          </h3>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            Estos datos se mostrarán a tus clientes al finalizar la compra.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Alias</label>
              <input 
                type="text" 
                className={`${inputClass} uppercase tracking-wider`}
                value={formData.alias}
                onChange={e => setFormData({...formData, alias: e.target.value.toUpperCase()})}
                placeholder="Ej: MI.TIENDA.MP"
              />
            </div>
            <div>
              <label className={labelClass}>CVU / CBU</label>
              <input 
                type="text" 
                className={inputClass}
                value={formData.cbu}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 22) setFormData({...formData, cbu: val});
                }}
                placeholder="0000000000000000000000"
                inputMode="numeric"
              />
              <p className="mt-1.5 text-xs text-gray-400 text-right">
                {formData.cbu.length}/22 dígitos
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-md transition-all active:scale-[0.98] ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-[#252D61] to-[#5A99CB] hover:shadow-lg hover:to-[#4A89BB]'
          }`}
        >
          {loading ? 'Creando Tienda...' : 'Abrir Mi Tienda 🚀'}
        </button>
      </form>
    </div>
  );
};

export default CreateShop;
