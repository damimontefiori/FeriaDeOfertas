import React, { useEffect, useState } from 'react';
import { getShopProducts } from '../services/db';
import { getImageUrl } from '../services/storage';
import { useLogger } from '../context/LoggerContext';
import { Edit, Trash2, Eye, ShoppingCart } from 'lucide-react';

const ProductList = ({ shopId, refreshTrigger, isOwner = false, onBuyClick }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addLog } = useLogger();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!shopId) return;
      
      setLoading(true);
      try {
        const productsData = await getShopProducts(shopId);
        
        // Resolver URLs de imágenes para cada producto
        const productsWithImages = await Promise.all(productsData.map(async (p) => {
          if (p.images && p.images.length > 0) {
            // Obtener URL firmada para la primera imagen
            const mainImageUrl = await getImageUrl(p.images[0]);
            return { ...p, mainImageUrl };
          }
          return p;
        }));

        setProducts(productsWithImages);
      } catch (error) {
        addLog(`Error cargando productos: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [shopId, refreshTrigger, addLog]);

  if (loading) return <div className="text-center p-4">Cargando productos...</div>;

  if (products.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">No hay productos disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {products.map(product => (
        <div key={product.id} className="bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
          <div className="h-48 bg-gray-200 relative">
            {product.mainImageUrl ? (
              <img 
                src={product.mainImageUrl} 
                alt={product.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Sin imagen
              </div>
            )}
            <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow">
              ${product.price}
            </div>
          </div>
          
          <div className="p-4 flex-grow flex flex-col">
            <h3 className="font-bold text-lg truncate">{product.title}</h3>
            <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-grow">{product.description}</p>
            
            <div className="flex justify-between items-center pt-2 border-t mt-auto">
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {product.status === 'available' ? 'Disponible' : product.status}
              </span>
              
              <div className="flex gap-2">
                {isOwner ? (
                  <>
                    <button className="p-1 text-gray-500 hover:text-blue-600" title="Ver detalle">
                      <Eye size={18} />
                    </button>
                    <button className="p-1 text-gray-500 hover:text-green-600" title="Editar">
                      <Edit size={18} />
                    </button>
                    <button className="p-1 text-gray-500 hover:text-red-600" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => onBuyClick && onBuyClick(product)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 hover:bg-blue-700"
                  >
                    <ShoppingCart size={16} /> Comprar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
