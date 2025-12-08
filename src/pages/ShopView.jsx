import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShopById } from '../services/db';
import ProductList from '../components/ProductList';
import { useAuth } from '../context/AuthContext';
import { useLogger } from '../context/LoggerContext';
import { Store, MapPin, MessageCircle } from 'lucide-react';

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

  const handleBuyClick = async (product) => {
    // Lógica de compra: Abrir WhatsApp con mensaje pre-armado
    // No requerimos login para esto, para reducir fricción.
    
    const message = `Hola! Vi tu producto "${product.title}" en FeriaDeOfertas (Precio: $${product.price}) y me interesa comprarlo. ¿Está disponible?`;
    const whatsappUrl = `https://wa.me/${shop.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    addLog(`Click en comprar para ${product.title}`, 'info');
  };

  if (loading) return <div className="p-10 text-center">Cargando tienda...</div>;

  if (!shop) return <div className="p-10 text-center text-red-500">Tienda no encontrada.</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 p-3 rounded-full">
            <Store className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{shop.name}</h1>
            <p className="text-gray-600">{shop.description}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin size={16} />
            <span>{shop.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            <span>Contacto directo disponible al comprar</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 px-2">Catálogo de Productos</h2>
      
      <ProductList 
        shopId={shopId} 
        isOwner={false} 
        onBuyClick={handleBuyClick}
      />
    </div>
  );
};

export default ShopView;
