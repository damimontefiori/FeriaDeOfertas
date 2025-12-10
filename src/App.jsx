import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LoggerProvider, useLogger } from './context/LoggerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemLogger from './components/SystemLogger';
import CreateShop from './components/CreateShop';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import ShopView from './pages/ShopView';
import { deleteProduct } from './services/db';
import { Copy, Share2, Check, Plus, ExternalLink } from 'lucide-react';

const Dashboard = () => {
  const { user, userProfile, profileError, loginWithGoogle, logout, refreshProfile } = useAuth();
  const { addLog } = useLogger();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshProducts, setRefreshProducts] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const navigate = useNavigate();

  const shopUrl = userProfile?.shopId ? `${window.location.origin}/shop/${userProfile.shopId}` : '';

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
            <button onClick={logout} className="bg-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300">Salir</button>
          </div>
        </header>

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
            <p className="text-xs mt-1">v{appVersion}</p>
          </footer>

          <SystemLogger />
        </div>
      </AuthProvider>
    </LoggerProvider>
  );
}

export default App;
