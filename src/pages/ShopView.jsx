import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShopById } from '../services/db';
import ProductList from '../components/ProductList';
import { useAuth } from '../context/AuthContext';
import { useLogger } from '../context/LoggerContext';
import { Store, MapPin, MessageCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { resolveTheme } from '../utils/themes';
import { getMapsSearchUrl } from '../utils/maps';
import SnowEffect from '../components/SnowEffect';
import LeafEffect from '../components/LeafEffect';
import { useImageUrl } from '../hooks/useImageUrl';

const ShopView = () => {
  const { shopId, productId } = useParams();
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { addLog } = useLogger();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoUrl = useImageUrl(shop?.logo);

  const isOwner = user && shop && user.uid === shop.ownerId;

  useEffect(() => {
    const loadShop = async () => {
      try {
        const shopData = await getShopById(shopId);
        setShop(shopData);
        if (shopData) {
          document.title = shopData.name;
        } else {
          document.title = 'Tienda Veloz';
        }
      } catch (error) {
        addLog(`Error cargando tienda: ${error.message}`, 'error');
        document.title = 'Tienda Veloz';
      } finally {
        setLoading(false);
      }
    };
    loadShop();
  }, [shopId, addLog]);

  if (loading) return <div className="p-10 text-center">Cargando tienda...</div>;

  if (!shop) return <div className="p-10 text-center text-red-500">Tienda no encontrada.</div>;

  // Tema por defecto si la tienda no eligió uno o si su tema especial ya caducó
  const themeStyles = resolveTheme(shop);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeStyles.bg}`}>
      
      {/* HEADER */}
      <div className={`relative ${themeStyles.header} ${themeStyles.text} pb-16 pt-10 px-4 shadow-lg overflow-hidden`}>
        {themeStyles.snow && <SnowEffect />}
        {themeStyles.leaf && <LeafEffect />}
        
        <div className="container mx-auto max-w-[1600px] relative z-20">
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={`Logo de ${shop.name}`}
                                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white object-contain p-1 shadow-md"
                            />
                        ) : (
                            <div className={`${themeStyles.badge} p-4 rounded-full backdrop-blur-sm shadow-inner`}>
                                <Store size={40} />
                            </div>
                        )}
                        {themeStyles.badgeEmoji && <span className="absolute -top-3 -right-2 text-3xl transform rotate-12 filter drop-shadow-md">{themeStyles.badgeEmoji}</span>}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold drop-shadow-sm break-words min-w-0">{shop.name}</h1>
                </div>

                {isOwner && (
                    <button
                        onClick={() => navigate('/')}
                        className={`${themeStyles.backButton} px-4 py-2 rounded-full backdrop-blur-md transition-all flex items-center gap-2 text-sm font-medium border shadow-sm whitespace-nowrap mt-2 shrink-0`}
                    >
                        <ArrowLeft size={18} /> Volver
                    </button>
                )}
            </div>
            
            {shop.description && (
                <p className="opacity-90 text-lg mt-4 ml-1">{shop.description}</p>
            )}
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-[1600px] -mt-8 relative z-20">
        {/* INFO CARD */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-8 flex flex-wrap gap-4 text-sm text-gray-600 border border-gray-100">
          {/* Con zona cargada, la ubicación abre Google Maps en esa zona (no es la dirección exacta) */}
          {shop.mapArea ? (
            <a
              href={getMapsSearchUrl(shop.mapArea)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
              title="Ver la zona en Google Maps"
            >
              <MapPin size={18} className="text-blue-500 shrink-0" />
              <span>{shop.location || shop.mapArea}</span>
              <span className="text-blue-600 font-medium group-hover:underline whitespace-nowrap flex items-center gap-1">
                Ver en el mapa <ExternalLink size={14} />
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" />
              <span>{shop.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-green-500" />
            <span>Contacto directo disponible al comprar</span>
          </div>
        </div>

        <h2 className={`text-2xl font-bold mb-6 px-2 ${themeStyles.heading}`}>Catálogo de Productos</h2>

        <ProductList
          shopId={shopId}
          isOwner={false}
          shopData={shop}
          theme={themeStyles}
          defaultView={shop.defaultView}
          categories={shop.categories || []}
          activeProductId={productId}
          onCloseActiveProduct={() => navigate(`/shop/${shopId}`)}
        />
      </div>
    </div>
  );
};

export default ShopView;
