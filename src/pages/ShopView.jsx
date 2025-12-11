import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShopById } from '../services/db';
import ProductList from '../components/ProductList';
import { useAuth } from '../context/AuthContext';
import { useLogger } from '../context/LoggerContext';
import { Store, MapPin, MessageCircle } from 'lucide-react';
import { themes } from '../utils/themes';
import SnowEffect from '../components/SnowEffect';

const ShopView = () => {
  const { shopId } = useParams();
  const { user, loginWithGoogle } = useAuth();
  const { addLog } = useLogger();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShop = async () => {
      try {
        const shopData = await getShopById(shopId);
        setShop(shopData);
      } catch (error) {
        addLog(`Error cargando tienda: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadShop();
  }, [shopId, addLog]);

  if (loading) return <div className="p-10 text-center">Cargando tienda...</div>;

  if (!shop) return <div className="p-10 text-center text-red-500">Tienda no encontrada.</div>;

  const themeStyles = themes[shop.theme] || themes.classic;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeStyles.bg}`}>
      
      {/* HEADER */}
      <div className={`relative ${themeStyles.header} ${themeStyles.text} pb-16 pt-10 px-4 shadow-lg overflow-hidden`}>
        {themeStyles.snow && <SnowEffect />}
        
        <div className="container mx-auto max-w-4xl relative z-20">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm relative shadow-inner">
                    <Store size={40} className="text-white" />
                    {themeStyles.snow && <span className="absolute -top-3 -right-2 text-3xl transform rotate-12 filter drop-shadow-md">🎅</span>}
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold drop-shadow-sm">{shop.name}</h1>
                    <p className="opacity-90 text-lg">{shop.description}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl -mt-8 relative z-20">
        {/* INFO CARD */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-8 flex flex-wrap gap-4 text-sm text-gray-600 border border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" />
            <span>{shop.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-green-500" />
            <span>Contacto directo disponible al comprar</span>
          </div>
        </div>

        <h2 className={`text-2xl font-bold mb-6 px-2 ${shop.theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Catálogo de Productos</h2>
        
        <ProductList 
          shopId={shopId} 
          isOwner={false} 
          shopData={shop}
        />
      </div>
    </div>
  );
};

export default ShopView;
