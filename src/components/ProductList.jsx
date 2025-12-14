import React, { useEffect, useState } from 'react';
import { getShopProducts, updateProductStatus } from '../services/db';
import { getImageUrl } from '../services/storage';
import { Trash2, Edit, ShoppingCart, ExternalLink, Copy, Check, Wallet, MessageCircle, HelpCircle, Archive, User, RotateCcw, X, Calendar } from 'lucide-react';

const ProductList = ({ shopId, refreshTrigger, isOwner, onEdit, onDelete, shopData }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(null);
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Sold Modal State
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [productToSell, setProductToSell] = useState(null);
  const [soldNote, setSoldNote] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      if (!shopId && !shopData) return; 
      setLoading(true);
      try {
        const idToUse = shopId || shopData?.id;
        const productsData = await getShopProducts(idToUse);
        
        const productsWithImages = await Promise.all(productsData.map(async (p) => {
          let finalImage = null;
          
          // Determine the source path/url
          const rawSource = p.images && p.images.length > 0 
            ? p.images[0] 
            : p.imageUrl;

          if (rawSource) {
            if (rawSource.startsWith('http')) {
              finalImage = rawSource;
            } else {
              finalImage = await getImageUrl(rawSource);
            }
          }
          return { ...p, finalImageUrl: finalImage };
        }));

        // Ordenar: Primero los disponibles, al final los vendidos
        const sortedProducts = productsWithImages.sort((a, b) => {
            if (a.status === 'sold' && b.status !== 'sold') return 1;
            if (a.status !== 'sold' && b.status === 'sold') return -1;
            return 0;
        });

        setProducts(sortedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [shopId, shopData, refreshTrigger]);

  const openSoldModal = (product) => {
    setProductToSell(product);
    setSoldNote(""); 
    setSoldModalOpen(true);
  };

  const handleConfirmSold = async () => {
    if (!productToSell) return;

    try {
      // Guardamos en DB (soldAt se genera automático en el backend)
      await updateProductStatus(productToSell.id, 'sold', soldNote);
      
      // Actualización optimista de la UI
      const now = new Date();
      setProducts(prev => {
        const updated = prev.map(p => 
          p.id === productToSell.id ? { 
              ...p, 
              status: 'sold', 
              buyerInfo: soldNote,
              soldAt: { seconds: now.getTime() / 1000 } // Simulamos timestamp para ver la fecha ya
          } : p
        );
        // Re-ordenar
        return updated.sort((a, b) => {
            if (a.status === 'sold' && b.status !== 'sold') return 1;
            if (a.status !== 'sold' && b.status === 'sold') return -1;
            return 0;
        });
      });
      
      setSoldModalOpen(false);
      setProductToSell(null);
    } catch (error) {
      console.error(error);
      alert("Error al actualizar estado: " + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleMarkAsAvailable = async (product) => {
    if (!window.confirm(`¿Volver a poner "${product.title}" como DISPONIBLE?`)) return;

    try {
      await updateProductStatus(product.id, 'available', "");
      
      setProducts(prev => {
        const updated = prev.map(p => 
          p.id === product.id ? { ...p, status: 'available', buyerInfo: "" } : p
        );
        return updated.sort((a, b) => {
            if (a.status === 'sold' && b.status !== 'sold') return 1;
            if (a.status !== 'sold' && b.status === 'sold') return -1;
            return 0;
        });
      });
    } catch (error) {
      alert("Error al actualizar estado: " + error.message);
    }
  };

  const openWhatsApp = (product, type = 'inquiry') => {
    if (!shopData?.whatsapp) return;
    
    let message = '';
    if (type === 'payment') {
      message = `Hola! 👋 Ya realicé la transferencia por *${product.title}* ($${product.price}). Te adjunto el comprobante.`;
    } else if (type === 'buy_direct') {
      message = `Hola! 👋 Quiero comprar *${product.title}*. ¿Cómo coordinamos el pago y entrega?`;
    } else {
      message = `Hola! 👋 Tengo una consulta sobre *${product.title}*.`;
    }
    
    const url = `https://wa.me/${shopData.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setSelectedProduct(null);
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openMercadoPagoApp = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/android/i.test(userAgent)) {
      // Android: Usar Intent Scheme que es más robusto en Chrome/Android
      window.location.href = "intent://home#Intent;scheme=mercadopago;package=com.mercadopago.wallet;end";
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      // iOS: Usar Custom Scheme directo
      window.location.href = "mercadopago://home";
    } else {
      // Desktop / Otros: Web
      window.open("https://www.mercadopago.com.ar", "_blank");
    }
  };

  // Filtrar productos: El dueño ve todo (vendidos en gris), el público solo ve disponibles
  const visibleProducts = isOwner 
    ? products 
    : products.filter(p => p.status !== 'sold');

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando catálogo...</div>;

  if (!visibleProducts || visibleProducts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-500">No hay productos disponibles.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleProducts.map((product) => (
          <div 
            key={product.id} 
            onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
            className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group cursor-pointer ${product.status === 'sold' ? 'opacity-80 bg-gray-50' : ''} ${expandedProductId === product.id ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02] z-10' : ''}`}
          >
            <div className={`relative overflow-hidden bg-gray-100 transition-all duration-500 ${expandedProductId === product.id ? 'aspect-[4/5]' : 'aspect-square'}`}>
              {product.finalImageUrl ? (
                <img 
                  src={product.finalImageUrl} 
                  alt={product.title} 
                  className={`w-full h-full object-cover transition-transform duration-500 ${product.status === 'sold' ? 'grayscale' : 'group-hover:scale-105'}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                  <span className="text-4xl">📷</span>
                </div>
              )}
              
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-sm font-bold shadow-sm ${product.status === 'sold' ? 'bg-red-600 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-800'}`}>
                {product.status === 'sold' ? 'VENDIDO' : `$${Number(product.price).toLocaleString()}`}
              </div>

              {product.status !== 'sold' && (
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-bold shadow-sm uppercase tracking-wide ${
                      product.condition === 'new' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-orange-400/90 text-white'
                  }`}>
                      {product.condition === 'new' ? 'Nuevo ✨' : 'Usado'}
                  </div>
              )}
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1" title={product.title}>{product.title}</h3>
              <p className={`text-sm text-gray-500 mb-4 flex-grow whitespace-pre-wrap ${expandedProductId === product.id ? '' : 'line-clamp-2'}`}>{product.description}</p>
              
              {/* INFO DE VENTA PARA EL DUEÑO */}
              {isOwner && product.status === 'sold' && (
                <div className="mb-3 p-3 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-gray-800">
                        <User size={14} />
                        <span>{product.buyerInfo || "Sin nota de venta"}</span>
                    </div>
                    {product.soldAt && (
                        <div className="flex items-center gap-2 text-gray-500 border-t border-gray-200 pt-1.5 mt-0.5">
                            <Calendar size={12} />
                            <span>{formatDate(product.soldAt)}</span>
                        </div>
                    )}
                </div>
              )}

              <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
                {isOwner ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button onClick={() => onEdit && onEdit(product)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                        <Edit size={16} /> Editar
                        </button>
                        <button onClick={() => onDelete && onDelete(product.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                        <Trash2 size={16} /> Borrar
                        </button>
                    </div>
                    
                    {/* BOTÓN DE ESTADO */}
                    {product.status !== 'sold' ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); openSoldModal(product); }}
                            className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                        >
                            <Archive size={16} /> Marcar como Vendido
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleMarkAsAvailable(product)}
                            className="w-full bg-white text-gray-600 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} /> Marcar Disponible
                        </button>
                    )}
                  </div>
                ) : (
                  <>
                    {product.status !== 'sold' ? (
                      <>
                        {/* BOTÓN COMPRAR (AMARILLO - Estilo Mercado Pago/Libre) */}
                        <button
                          onClick={() => {
                            if (shopData?.alias || shopData?.cbu) {
                              setSelectedProduct(product);
                            } else {
                              openWhatsApp(product, 'buy_direct');
                            }
                          }}
                          className="w-full bg-yellow-400 text-gray-900 py-2.5 px-4 rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transform duration-100"
                        >
                          <ShoppingCart size={18} />
                          Comprar
                        </button>

                        {/* BOTÓN PREGUNTAR (VERDE - Estilo WhatsApp) */}
                        <button
                          onClick={() => openWhatsApp(product, 'inquiry')}
                          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm active:scale-95 transform duration-100"
                        >
                          <MessageCircle size={18} />
                          Preguntar por WhatsApp
                        </button>
                      </>
                    ) : (
                      <div className="w-full bg-gray-100 text-gray-500 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold cursor-not-allowed">
                        🚫 Agotado
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE PAGO INTELIGENTE */}
      {/* --- MODAL DE VENTA (ESTILO CONFIRMAR COMPRA) --- */}
      {soldModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg">Confirmar Venta</h3>
                    <button onClick={() => setSoldModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-500 mb-1">Vas a marcar como vendido:</p>
                        <p className="font-bold text-gray-800 text-lg line-clamp-1">{productToSell?.title}</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Nota / Comprador (Opcional)
                        </label>
                        <input 
                            type="text" 
                            value={soldNote}
                            onChange={(e) => setSoldNote(e.target.value)}
                            placeholder="Ej: Juan Pérez, Seña 50%..."
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-gray-800"
                            autoFocus
                        />
                    </div>

                    <button 
                        onClick={handleConfirmSold}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                        <Archive size={18} />
                        Confirmar Venta
                    </button>
                </div>
            </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Header con gradiente amarillo/azul (MP vibes) */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-blue-500"></div>
            
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Confirmar Compra</h3>
              <p className="text-sm text-gray-500 mt-1">Estás por comprar: <span className="font-medium text-gray-800">{selectedProduct.title}</span></p>
              <div className="mt-1 text-2xl font-bold text-gray-800">${Number(selectedProduct.price).toLocaleString()}</div>
            </div>
            
            {/* INSTRUCCIONES COMPACTAS */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                <div className="flex flex-col gap-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                        <span>Copia el Alias o CBU.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                        <span>Transfiere el dinero.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                        <span>Envía el comprobante.</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-4">
              {/* ALIAS CARD */}
              {shopData.alias && (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 relative group">
                  <p className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">Alias (Mercado Pago)</p>
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono font-bold text-gray-800">{shopData.alias}</code>
                    <button 
                      onClick={() => handleCopy(shopData.alias, 'alias')}
                      className={`p-2 rounded-lg transition-all ${copiedField === 'alias' ? 'bg-green-500 text-white' : 'bg-white text-blue-600 shadow-sm hover:bg-blue-50'}`}
                    >
                      {copiedField === 'alias' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* CBU CARD */}
              {shopData.cbu && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">CBU / CVU</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-600 break-all">{shopData.cbu}</code>
                    <button 
                      onClick={() => handleCopy(shopData.cbu, 'cbu')}
                      className={`p-2 rounded-lg transition-all ml-2 ${copiedField === 'cbu' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 shadow-sm hover:bg-gray-100'}`}
                    >
                      {copiedField === 'cbu' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ACCIONES */}
            <div className="space-y-3">
              {shopData.alias && (
                <button
                  onClick={openMercadoPagoApp}
                  className="w-full bg-yellow-400 text-gray-900 py-3 rounded-xl font-bold hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 shadow-md shadow-yellow-200"
                >
                  <Wallet size={18} />
                  Abrir Mercado Pago
                </button>
              )}

              <button
                onClick={() => openWhatsApp(selectedProduct, 'payment')}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-200"
              >
                <ExternalLink size={18} />
                Ya pagué, enviar comprobante
              </button>
              
              <button
                onClick={() => openWhatsApp(selectedProduct, 'buy_direct')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 font-medium"
              >
                Prefiero acordar con el vendedor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductList;
