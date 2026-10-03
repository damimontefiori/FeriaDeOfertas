import React, { useEffect, useRef, useState } from 'react';
import { getShopProducts, updateProductStatus } from '../services/db';
import { getImageUrl } from '../services/storage';
import { themes } from '../utils/themes';
import { Trash2, Edit, ShoppingCart, ExternalLink, Copy, Check, Wallet, MessageCircle, Archive, User, RotateCcw, X, Calendar, Share2, Maximize2, LayoutGrid, Grid3x3, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';

// Productos por página. Son múltiplos de las columnas de cada vista (grande: 1-4, compacta: 2-6)
// para que la última fila de cada página quede completa.
const PAGE_SIZE = { grid: 12, compact: 24 };
const MAX_VISIBLE_CATEGORY_PILLS = 10;

// Números de página a mostrar: primera, última y vecinas de la actual, con '…' en los saltos
const getPageItems = (current, total) => {
  const items = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      items.push(i);
    } else if (items[items.length - 1] !== '…') {
      items.push('…');
    }
  }
  return items;
};

const formatPrice = (price) => `$${Number(price).toLocaleString()}`;

const ProductList = ({ shopId, refreshTrigger, isOwner, onEdit, onDelete, shopData, categories = [], activeProductId = null, onCloseActiveProduct, theme = themes.classic, defaultView = 'grid' }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState(defaultView);
  const [page, setPage] = useState(1);
  const listTopRef = useRef(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductView, setSelectedProductView] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [lightboxProduct, setLightboxProduct] = useState(null);

  // Sold Modal State
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [productToSell, setProductToSell] = useState(null);
  const [soldNote, setSoldNote] = useState("");

  // La vista inicial la define la tienda; en el panel llega después de cargar shopData
  useEffect(() => {
    setViewMode(defaultView);
    setPage(1);
  }, [defaultView]);

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
    const productLink = getProductLink(product);

    let message = '';
    if (type === 'payment') {
      message = `Hola! 👋 Ya realicé la transferencia por *${product.title}* (${formatPrice(product.price)}). Te adjunto el comprobante.`;
    } else if (type === 'buy_direct') {
      message = `Hola! 👋 Quiero comprar *${product.title}*. ¿Cómo coordinamos el pago y entrega?`;
    } else {
      message = `Hola! 👋 Tengo una consulta sobre *${product.title}*.\n\n🔗 Link directo al producto: ${productLink}`;
    }

    const url = `https://wa.me/${shopData.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setSelectedProduct(null);
  };

  // "Comprar": con Alias/CBU abre el modal de pago; sin datos de pago va directo a WhatsApp
  const handleBuy = (product) => {
    if (shopData?.alias || shopData?.cbu) {
      setSelectedProduct(product);
    } else {
      openWhatsApp(product, 'buy_direct');
    }
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

  const getProductLink = (product) => {
    const currentShopId = shopId || shopData?.id;
    return `${window.location.origin}/shop/${currentShopId}/p/${product.id}`;
  };

  const shareProductOnWhatsApp = (product) => {
    const link = getProductLink(product);
    const text = `Mira este producto en Tienda Veloz:\n\n${product.title}\n${formatPrice(product.price)}\n\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const closeProductView = () => {
    setSelectedProductView(null);
    // Solo el modal abierto por deep link (/p/:productId) vuelve a la URL de la tienda
    if (activeProductId && onCloseActiveProduct) {
      onCloseActiveProduct();
    }
  };

  useEffect(() => {
    if (!activeProductId) return;
    const product = products.find((item) => item.id === activeProductId);
    if (product) {
      setSelectedProductView(product);
    }
  }, [activeProductId, products]);

  useEffect(() => {
    if (!lightboxProduct) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxProduct(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxProduct]);

  const getTimestampValue = (timestamp) => {
    if (!timestamp) return 0;
    if (typeof timestamp.seconds === 'number') return timestamp.seconds;
    return Math.floor(new Date(timestamp).getTime() / 1000) || 0;
  };

  const compareProducts = (firstProduct, secondProduct) => {
    if (firstProduct.status === 'sold' && secondProduct.status !== 'sold') return 1;
    if (firstProduct.status !== 'sold' && secondProduct.status === 'sold') return -1;

    if (sortBy === 'price-asc') {
      return Number(firstProduct.price) - Number(secondProduct.price);
    }

    if (sortBy === 'new-first') {
      const firstIsNew = firstProduct.condition === 'new' ? 1 : 0;
      const secondIsNew = secondProduct.condition === 'new' ? 1 : 0;
      if (firstIsNew !== secondIsNew) return secondIsNew - firstIsNew;
    }

    return getTimestampValue(secondProduct.createdAt) - getTimestampValue(firstProduct.createdAt);
  };

  // --- Filtros, orden y paginación ---
  const isCompact = viewMode === 'compact';
  const showBuyButton = shopData?.showBuyButton !== false;

  // Filtrar productos: El dueño ve todo (vendidos en gris), el público solo ve disponibles
  const visibleProducts = isOwner
    ? products
    : products.filter(p => p.status !== 'sold');

  // Si la categoría elegida dejó de existir (renombrada o borrada), se vuelve a "Todos"
  const activeCategory = selectedCategory && categories.includes(selectedCategory) ? selectedCategory : null;
  const filteredProducts = activeCategory
    ? visibleProducts.filter(p => p.category === activeCategory)
    : visibleProducts;

  const sortedProducts = [...filteredProducts].sort(compareProducts);

  const pageSize = isCompact ? PAGE_SIZE.compact : PAGE_SIZE.grid;
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageProducts = sortedProducts.slice(pageStart, pageStart + pageSize);

  // Count products per category (for pills)
  const categoryCounts = {};
  visibleProducts.forEach(p => {
    if (p.category) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }
  });
  const pillCategories = categories.filter(cat => categoryCounts[cat]);
  let shownPillCategories = showAllCategories
    ? pillCategories
    : pillCategories.slice(0, MAX_VISIBLE_CATEGORY_PILLS);
  if (activeCategory && !shownPillCategories.includes(activeCategory)) {
    shownPillCategories = [...shownPillCategories, activeCategory];
  }
  const hiddenPillsCount = pillCategories.length - shownPillCategories.length;

  const sortOptions = [
    { value: 'recent', label: 'Más recientes' },
    { value: 'price-asc', label: 'Precio menor' },
    { value: 'new-first', label: 'Nuevos primero' }
  ];

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const changeSort = (value) => {
    setSortBy(value);
    setPage(1);
  };

  const changeView = (mode) => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setPage(1);
    setExpandedProductId(null);
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    setExpandedProductId(null);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Bloques reutilizados por las cards y el modal de detalle ---

  // Las acciones del dueño abren otros modales: el de detalle se cierra primero
  const runOwnerAction = (fromModal, action) => {
    if (fromModal) closeProductView();
    action();
  };

  const renderSoldInfo = (product) => (
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
  );

  const renderActions = (product, fromModal = false) => {
    if (isOwner) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
              <button onClick={() => runOwnerAction(fromModal, () => onEdit && onEdit(product))} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
              <Edit size={16} /> Editar
              </button>
              <button onClick={() => runOwnerAction(fromModal, () => onDelete && onDelete(product))} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
              <Trash2 size={16} /> Borrar
              </button>
          </div>

          {/* BOTÓN DE ESTADO */}
          {product.status !== 'sold' ? (
              <button
                  onClick={() => runOwnerAction(fromModal, () => openSoldModal(product))}
                  className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                  <Archive size={16} /> Marcar como Vendido
              </button>
          ) : (
              <button
                  onClick={() => runOwnerAction(fromModal, () => handleMarkAsAvailable(product))}
                  className="w-full bg-white text-gray-600 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                  <RotateCcw size={16} /> Marcar Disponible
              </button>
          )}

          <button
            onClick={() => shareProductOnWhatsApp(product)}
            className="w-full bg-white text-gray-700 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Compartir por WhatsApp
          </button>
        </div>
      );
    }

    if (product.status === 'sold') {
      return (
        <div className="w-full bg-gray-100 text-gray-500 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold cursor-not-allowed">
          🚫 Agotado
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* BOTÓN COMPRAR (AMARILLO - Estilo Mercado Pago/Libre). La tienda puede ocultarlo */}
        {showBuyButton && (
          <button
            onClick={() => handleBuy(product)}
            className="w-full bg-yellow-400 text-gray-900 py-2.5 px-4 rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transform duration-100"
          >
            <ShoppingCart size={18} />
            Comprar
          </button>
        )}

        {/* BOTÓN PREGUNTAR (VERDE - Estilo WhatsApp) */}
        <button
          onClick={() => openWhatsApp(product, 'inquiry')}
          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm active:scale-95 transform duration-100"
        >
          <MessageCircle size={18} />
          Preguntar por WhatsApp
        </button>

        <button
          onClick={() => shareProductOnWhatsApp(product)}
          className="w-full bg-white text-gray-700 border border-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Share2 size={18} />
          Compartir
        </button>
      </div>
    );
  };

  // Único botón de la card compacta; el resto de las acciones está en el modal de detalle
  const renderCompactAction = (product) => {
    const base = "w-full py-1.5 sm:py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5";

    if (isOwner) {
      return (
        <button onClick={() => setSelectedProductView(product)} className={`${base} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
          <Settings2 size={14} /> Gestionar
        </button>
      );
    }
    if (product.status === 'sold') {
      return <div className={`${base} bg-gray-100 text-gray-400 cursor-not-allowed`}>Agotado</div>;
    }
    if (showBuyButton) {
      return (
        <button onClick={() => handleBuy(product)} className={`${base} bg-yellow-400 text-gray-900 hover:bg-yellow-500`}>
          <ShoppingCart size={14} /> Comprar
        </button>
      );
    }
    return (
      <button onClick={() => openWhatsApp(product, 'inquiry')} className={`${base} bg-green-600 text-white hover:bg-green-700`}>
        <MessageCircle size={14} /> Consultar
      </button>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando catálogo...</div>;

  if (!visibleProducts || visibleProducts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-500">No hay productos disponibles.</p>
      </div>
    );
  }

  const pillBase = "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border";
  const pillInactive = "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50";
  const pageButtonBase = "min-w-[40px] h-10 px-2.5 rounded-lg border text-sm font-bold transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <>
      <div ref={listTopRef} className="flex flex-col gap-3 mb-4 scroll-mt-4">
        {pillCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectCategory(null)}
              className={`${pillBase} ${activeCategory === null ? theme.pill : pillInactive}`}
            >
              Todos ({visibleProducts.length})
            </button>
            {shownPillCategories.map(cat => (
              <button
                key={cat}
                onClick={() => selectCategory(activeCategory === cat ? null : cat)}
                className={`${pillBase} ${activeCategory === cat ? theme.pill : pillInactive}`}
              >
                {cat} ({categoryCounts[cat]})
              </button>
            ))}
            {hiddenPillsCount > 0 && (
              <button
                onClick={() => setShowAllCategories(true)}
                className={`${pillBase} bg-white text-gray-500 border-dashed border-gray-300 hover:bg-gray-50`}
              >
                +{hiddenPillsCount} más
              </button>
            )}
            {showAllCategories && pillCategories.length > MAX_VISIBLE_CATEGORY_PILLS && (
              <button
                onClick={() => setShowAllCategories(false)}
                className={`${pillBase} bg-white text-gray-500 border-dashed border-gray-300 hover:bg-gray-50`}
              >
                Ver menos
              </button>
            )}
          </div>
        )}

        {/* BARRA DE VISTA Y ORDEN */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div role="group" aria-label="Cambiar vista" className="grid grid-cols-2 bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => changeView('grid')}
              aria-pressed={!isCompact}
              className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${!isCompact ? `${theme.pillAlt} shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={16} /> Vista grande
            </button>
            <button
              onClick={() => changeView('compact')}
              aria-pressed={isCompact}
              className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${isCompact ? `${theme.pillAlt} shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Grid3x3 size={16} /> Vista compacta
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Ordenar
            </span>
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => changeSort(option.value)}
                className={`${pillBase} ${sortBy === option.value ? theme.pillAlt : pillInactive}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className={`text-sm ${theme.label}`} aria-live="polite">
          Mostrando {pageStart + 1}–{pageStart + pageProducts.length} de {sortedProducts.length} producto{sortedProducts.length === 1 ? '' : 's'}
        </p>
      </div>

      {isCompact ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {pageProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col ${product.status === 'sold' ? 'opacity-80' : ''}`}
            >
              <button
                type="button"
                onClick={() => setSelectedProductView(product)}
                className="text-left flex flex-col flex-grow group"
                aria-label={`Ver ${product.title}`}
              >
                <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
                  {product.finalImageUrl ? (
                    <img
                      src={product.finalImageUrl}
                      alt={product.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-300 ${product.status === 'sold' ? 'grayscale' : 'group-hover:scale-105'}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-3xl">📷</span>
                    </div>
                  )}
                  {product.status === 'sold' ? (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white">VENDIDO</span>
                  ) : (
                    <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide text-white ${product.condition === 'new' ? 'bg-green-500' : 'bg-orange-400/90'}`}>
                      {product.condition === 'new' ? 'Nuevo' : 'Usado'}
                    </span>
                  )}
                </div>
                <div className="p-2 sm:p-2.5 w-full">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5em]">{product.title}</h3>
                  <p className="mt-1 text-sm sm:text-base font-bold text-gray-900">
                    {product.status === 'sold' ? 'Vendido' : formatPrice(product.price)}
                  </p>
                </div>
              </button>
              <div className="px-2 pb-2 sm:px-2.5 sm:pb-2.5">
                {renderCompactAction(product)}
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pageProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
            className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group cursor-pointer ${product.status === 'sold' ? 'opacity-80 bg-gray-50' : ''} ${expandedProductId === product.id ? `ring-2 ${theme.ring} shadow-lg scale-[1.02] z-10` : ''}`}
          >
            <div className={`relative overflow-hidden bg-gray-100 transition-all duration-500 ${expandedProductId === product.id ? 'aspect-[4/5]' : 'aspect-square'}`}>
              {product.finalImageUrl ? (
                <img
                  src={product.finalImageUrl}
                  alt={product.title}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform duration-500 ${product.status === 'sold' ? 'grayscale' : 'group-hover:scale-105'}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                  <span className="text-4xl">📷</span>
                </div>
              )}

              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-sm font-bold shadow-sm ${product.status === 'sold' ? 'bg-red-600 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-800'}`}>
                {product.status === 'sold' ? 'VENDIDO' : formatPrice(product.price)}
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

              {product.finalImageUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxProduct(product); }}
                  className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-gray-700 p-1.5 rounded-full shadow-sm hover:bg-white hover:text-gray-900 transition-colors"
                  title="Ver foto completa"
                  aria-label="Ver foto completa"
                >
                  <Maximize2 size={16} />
                </button>
              )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1" title={product.title}>{product.title}</h3>
              <p className={`text-sm text-gray-500 mb-4 flex-grow whitespace-pre-wrap ${expandedProductId === product.id ? '' : 'line-clamp-2'}`}>{product.description}</p>

              {/* INFO DE VENTA PARA EL DUEÑO */}
              {isOwner && product.status === 'sold' && renderSoldInfo(product)}

              <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                {renderActions(product)}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <nav aria-label="Páginas del catálogo" className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 mt-8 mb-4">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Página anterior"
            className={`${pageButtonBase} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`}
          >
            <ChevronLeft size={18} />
          </button>
          {getPageItems(currentPage, totalPages).map((item, index) => (
            item === '…' ? (
              <span key={`gap-${index}`} className={`px-1 ${theme.label}`}>…</span>
            ) : (
              <button
                key={item}
                onClick={() => changePage(item)}
                aria-label={`Página ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                className={`${pageButtonBase} ${item === currentPage ? theme.pillAlt : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {item}
              </button>
            )
          ))}
          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
            className={`${pageButtonBase} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`}
          >
            <ChevronRight size={18} />
          </button>
        </nav>
      )}

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

      {/* --- MODAL DE DETALLE (deep link y vista compacta) --- */}
      {selectedProductView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{selectedProductView.title}</h3>
              <button
                onClick={closeProductView}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto">
              <div className="bg-gray-100 aspect-square relative">
                {selectedProductView.finalImageUrl ? (
                  <img
                    src={selectedProductView.finalImageUrl}
                    alt={selectedProductView.title}
                    className={`w-full h-full object-cover ${selectedProductView.status === 'sold' ? 'grayscale' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl">📷</span>
                  </div>
                )}

                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold shadow-sm ${selectedProductView.status === 'sold' ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-800'}`}>
                  {selectedProductView.status === 'sold' ? 'VENDIDO' : formatPrice(selectedProductView.price)}
                </div>

                {selectedProductView.status !== 'sold' && (
                  <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold shadow-sm uppercase tracking-wide text-white ${selectedProductView.condition === 'new' ? 'bg-green-500' : 'bg-orange-400/90'}`}>
                    {selectedProductView.condition === 'new' ? 'Nuevo ✨' : 'Usado'}
                  </div>
                )}

                {selectedProductView.finalImageUrl && (
                  <button
                    onClick={() => setLightboxProduct(selectedProductView)}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 p-2 rounded-full shadow-sm hover:bg-white hover:text-gray-900 transition-colors"
                    title="Ver foto completa"
                    aria-label="Ver foto completa"
                  >
                    <Maximize2 size={18} />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {selectedProductView.category && (
                  <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {selectedProductView.category}
                  </span>
                )}
                <p className="text-gray-600 whitespace-pre-wrap">{selectedProductView.description}</p>

                {isOwner && selectedProductView.status === 'sold' && renderSoldInfo(selectedProductView)}

                {renderActions(selectedProductView, true)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PAGO INTELIGENTE */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Header con gradiente amarillo/azul (MP vibes) */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-blue-500"></div>

            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Confirmar Compra</h3>
              <p className="text-sm text-gray-500 mt-1">Estás por comprar: <span className="font-medium text-gray-800">{selectedProduct.title}</span></p>
              <div className="mt-1 text-2xl font-bold text-gray-800">{formatPrice(selectedProduct.price)}</div>
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

      {lightboxProduct && (
        <div
          onClick={() => setLightboxProduct(null)}
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <button
            onClick={() => setLightboxProduct(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
            aria-label="Cerrar"
          >
            <X size={32} />
          </button>

          <img
            src={lightboxProduct.finalImageUrl}
            alt={lightboxProduct.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
};

export default ProductList;
