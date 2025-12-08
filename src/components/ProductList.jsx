import React, { useEffect, useState } from 'react';
import { Edit, Trash2, Eye, ShoppingCart, MessageCircle } from 'lucide-react';
import { getShopProducts } from '../services/db';
import { getImageUrl } from '../services/storage';

const ProductCard = ({ product, isOwner, onBuyClick }) => {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const resolveImage = async () => {
      // Determine the source path/url
      // Support both legacy imageUrl and new images array
      const rawSource = product.images && product.images.length > 0 
        ? product.images[0] 
        : product.imageUrl;

      if (!rawSource) {
        setImageUrl(null);
        return;
      }

      // If it's already a URL (legacy or external), use it directly
      if (rawSource.startsWith('http')) {
        setImageUrl(rawSource);
        return;
      }

      // Otherwise, it's an R2 key, resolve it using storage service
      const url = await getImageUrl(rawSource);
      setImageUrl(url);
    };

    resolveImage();
  }, [product]);

  const title = product.title || product.name || 'Sin título';
  const price = Number(product.price || 0).toLocaleString();

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
            <span className="text-4xl">📷</span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm backdrop-blur-md ${
            product.status === 'available' 
              ? 'bg-green-100/90 text-green-700' 
              : 'bg-gray-100/90 text-gray-700'
          }`}>
            {product.status === 'available' ? 'Disponible' : product.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-1" title={title}>
            {title}
          </h3>
          <p className="text-blue-600 font-bold text-xl mt-1">
            ${price}
          </p>
        </div>

        <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow">
          {product.description}
        </p>

        {/* Actions */}
        <div className="mt-auto pt-3 border-t border-gray-50">
          {isOwner ? (
            <div className="flex justify-between items-center">
              <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Ver detalle">
                <Eye size={20} />
              </button>
              <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Editar">
                <Edit size={20} />
              </button>
              <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">
                <Trash2 size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => onBuyClick && onBuyClick(product)}
              className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
            >
              <MessageCircle size={18} />
              Comprar por WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductList = ({ products: initialProducts, shopId, isOwner, onBuyClick, refreshTrigger }) => {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts && !!shopId);

  useEffect(() => {
    // If products are passed directly, use them
    if (initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    // Otherwise, if shopId is provided, fetch them
    if (shopId) {
      const loadProducts = async () => {
        setLoading(true);
        try {
          const data = await getShopProducts(shopId);
          setProducts(data);
        } catch (error) {
          console.error("Error loading products:", error);
        } finally {
          setLoading(false);
        }
      };
      loadProducts();
    }
  }, [shopId, initialProducts, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-500">No hay productos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          isOwner={isOwner} 
          onBuyClick={onBuyClick} 
        />
      ))}
    </div>
  );
};

export default ProductList;
