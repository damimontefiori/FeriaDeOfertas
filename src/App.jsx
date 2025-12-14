import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LoggerProvider, useLogger } from './context/LoggerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemLogger from './components/SystemLogger';
import CreateShop from './components/CreateShop';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import ShopView from './pages/ShopView';
import { deleteProduct, getShopById, updateShop } from './services/db';
import { Copy, Share2, Check, Plus, ExternalLink, Settings, Palette, X } from 'lucide-react';
import { themes } from './utils/themes';

const Dashboard = () => {
  const { user, userProfile, profileError, loginWithGoogle, logout, refreshProfile } = useAuth();
  const { addLog } = useLogger();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shopData, setShopData] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshProducts, setRefreshProducts] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const navigate = useNavigate();

  const shopUrl = userProfile?.shopId ? `${window.location.origin}/shop/${userProfile.shopId}` : '';

  useEffect(() => {
    if (userProfile?.shopId) {
      getShopById(userProfile.shopId).then(setShopData);
    }
  }, [userProfile]);

  const handleUpdateTheme = async (themeKey) => {
    if (!shopData) return;
    try {
      await updateShop(shopData.id, { theme: themeKey });
      setShopData(prev => ({ ...prev, theme: themeKey }));
      addLog(`Tema actualizado a: ${themes[themeKey].name}`, 'success');
    } catch (error) {
      console.error("Error updating theme:", error);
      addLog("Error al cambiar el tema", 'error');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto permanentemente?")) {
      return;
    }

    try {
      await deleteProduct(productId);
      setRefreshProducts(prev => prev + 1);
      addLog('Producto eliminado correctamente', 'info');
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert("Hubo un error al intentar borrar el producto.");
      addLog(`Error eliminando producto: ${error.message}`, 'error');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi Tienda en FeriaDeOfertas',
          text: '¡Mira mis productos!',
          url: shopUrl,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">FeriaDeOfertas</h1>
        <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
          Crea tu propia tienda virtual en segundos y comparte tus productos con amigos.
        </p>
        <button 
          onClick={loginWithGoogle}
          className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-1" alt="G" />
          Comenzar con Google
        </button>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl text-red-600 font-bold mb-2">Error cargando perfil</h2>
        <p className="text-gray-700 mb-4">{profileError}</p>
        <p className="text-sm text-gray-500 mb-6">
          Posible causa: No has creado la base de datos en Firebase Console o las reglas de seguridad bloquean el acceso.
        </p>
        <button onClick={logout} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
          Cerrar Sesión e Intentar de Nuevo
        </button>
      </div>
    );
  }

  // Usuario logueado pero sin tienda
  if (userProfile && !userProfile.shopId) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <p>Hola, <b>{user.displayName}</b></p>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Cerrar Sesión</button>
        </div>
        <CreateShop onShopCreated={refreshProfile} />
      </div>
    );
  }

  // Usuario con tienda (Dashboard Vendedor)
  if (userProfile && userProfile.shopId) {
    return (
      <div className="container mx-auto p-4">
        <header className="flex justify-between items-center mb-8 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Mi Tienda</h1>
            <p className="text-sm text-gray-500">Gestiona tus productos</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/shop/${userProfile.shopId}`)}
              className="text-blue-600 hover:underline text-sm"
            >
              Ver mi tienda pública
            </button>
            <span className="text-sm hidden md:inline text-gray-400">|</span>
            <span className="text-sm hidden md:inline">{user.email}</span>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              title="Configuración"
            >
              <Settings size={20} />
            </button>
            <button onClick={logout} className="bg-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300">Salir</button>
          </div>
        </header>

        {/* SETTINGS MODAL */}
        {showSettings && shopData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800">
                  <Settings size={20} /> Configurar Tienda
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Palette size={18} className="text-blue-600" /> 
                    Tema Visual
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(themes).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => handleUpdateTheme(key)}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          (shopData.theme || 'classic') === key 
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">{t.name}</span>
                        {(shopData.theme || 'classic') === key && <Check size={18} />}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded border border-blue-100">
                  ℹ️ El tema seleccionado cambiará el fondo y el encabezado de tu tienda pública.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-bold text-gray-800">¡Tu tienda está lista! 🚀</h2>
              <p className="text-sm text-gray-500">Comparte el enlace para empezar a vender.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50 p-2 rounded-lg border border-gray-200 max-w-full">
              <div className="flex-grow md:flex-grow-0 overflow-hidden min-w-0">
                <p className="text-sm text-gray-600 truncate md:max-w-[300px] select-all font-mono">
                  {shopUrl}
                </p>
              </div>
              
              <div className="flex gap-1 shrink-0">
                <button 
                  onClick={handleCopyLink}
                  className="p-2 hover:bg-white rounded-md text-gray-600 transition-colors shadow-sm"
                  title="Copiar enlace"
                >
                  {copiedLink ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
                
                <button 
                  onClick={handleShare}
                  className="p-2 hover:bg-white rounded-md text-blue-600 transition-colors shadow-sm"
                  title="Compartir"
                >
                  <Share2 size={18} />
                </button>

                <a 
                  href={shopUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-white rounded-md text-gray-600 transition-colors shadow-sm"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center md:justify-start border-t pt-6">
             <button 
              onClick={() => {
                setEditingProduct(null);
                setShowAddProduct(true);
              }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm shadow-blue-200"
            >
              <Plus size={20} />
              Agregar Nuevo Producto
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-4 text-gray-700">Mis Productos</h3>
        <ProductList 
          shopId={userProfile.shopId} 
          refreshTrigger={refreshProducts} 
          isOwner={true}
          onDelete={handleDeleteProduct}
          onEdit={handleEditProduct}
        />

        {showAddProduct && (
          <AddProduct 
            onClose={() => {
              setShowAddProduct(false);
              setEditingProduct(null);
            }} 
            onProductAdded={() => {
              setShowAddProduct(false);
              setEditingProduct(null);
              setRefreshProducts(prev => prev + 1);
              addLog(editingProduct ? 'Producto actualizado' : 'Producto agregado', 'info');
            }}
            productToEdit={editingProduct}
          />
        )}
      </div>
    );
  }

  return <div className="p-10 text-center">Cargando perfil...</div>;
};

function App() {
  const appVersion = import.meta.env.VITE_APP_VERSION || 'DEV';
  const SHOW_LOGS = false;

  return (
    <LoggerProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/shop/:shopId" element={<ShopView />} />
            </Routes>
          </main>
          
          <footer className="bg-white p-4 text-center text-gray-500 text-sm border-t">
            <p>&copy; {new Date().getFullYear()} FeriaDeOfertas</p>
            <p className="mt-1">
              Desarrollado por <a href="https://www.linkedin.com/in/damian-montefiori/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Damian Montefiori</a>
            </p>
            <p className="text-xs mt-1">v{appVersion}</p>
          </footer>

          {SHOW_LOGS && <SystemLogger />}
        </div>
      </AuthProvider>
    </LoggerProvider>
  );
}

export default App;
