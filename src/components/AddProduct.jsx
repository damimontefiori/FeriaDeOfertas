import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addProduct } from '../services/db';
import { uploadFile } from '../services/storage';
import { useLogger } from '../context/LoggerContext';
import { PackagePlus, X, Upload, Image as ImageIcon, Wand2, Loader2 } from 'lucide-react';

const AddProduct = ({ onClose, onProductAdded }) => {
  const { userProfile } = useAuth();
  const { addLog } = useLogger();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: ''
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFiles([file]); // Por ahora manejamos 1 archivo principal para simplificar la IA
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // --- LÓGICA DE IA (AZURE) ---
  const handleMagicFill = async () => {
    if (files.length === 0) {
      alert("Por favor, sube una imagen primero.");
      return;
    }

    setAiLoading(true);
    addLog("Consultando a Azure Vision...", "info");

    try {
      // 1. Leer archivo como Base64
      const reader = new FileReader();
      reader.readAsDataURL(files[0]);
      
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1]; // Quitar cabecera data:image...
        
        // 2. Llamar a nuestra función backend
        // Nota: En local esto requiere 'netlify dev'. En producción funciona directo.
        const response = await fetch('/.netlify/functions/analyze-image', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64String }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.details || "Error en el servidor");
        }

        const data = await response.json();
        
        // 3. Rellenar formulario
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          description: data.description || prev.description
        }));
        
        addLog("¡Datos generados por IA!", "success");
        setAiLoading(false);
      };

    } catch (error) {
      console.error(error);
      addLog(`Error IA: ${error.message}`, "error");
      alert("No se pudo analizar la imagen. (Si estás en local, asegúrate de usar 'netlify dev')");
      setAiLoading(false);
    }
  };
  // ---------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile?.shopId) {
      alert('Error: No tienes una tienda asociada.');
      return;
    }
    if (files.length === 0) {
      alert('Debes subir al menos una imagen del producto.');
      return;
    }

    setLoading(true);
    addLog('Iniciando carga de producto...', 'info');

    try {
      // 1. Subir imágenes a R2
      const imageUrls = [];
      for (const file of files) {
        addLog(`Subiendo imagen: ${file.name}...`, 'info');
        const url = await uploadFile(file);
        imageUrls.push(url);
      }

      // 2. Guardar producto en Firestore
      const productData = {
        ...formData,
        images: imageUrls
      };

      await addProduct(userProfile.shopId, productData);
      addLog('Producto creado exitosamente', 'success');
      
      if (onProductAdded) onProductAdded();
      if (onClose) onClose();

    } catch (error) {
      console.error("Error detallado:", error);
      addLog(`Error al crear producto: ${error.message}`, 'error');
      alert(`Hubo un error al crear el producto: ${error.message}\n\nSi dice "Network Error" o "Failed to fetch", es probable que falte configurar CORS en tu bucket de R2.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <PackagePlus size={24} /> Nuevo Producto
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Image Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="mx-auto h-48 object-contain rounded shadow-sm" />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <Upload size={40} className="mb-2 text-blue-500" />
                <p className="font-medium">Toca para subir foto</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG (Máx 5MB)</p>
              </div>
            )}
          </div>

          {/* Botón Mágico IA */}
          {imagePreview && (
            <button
              type="button"
              onClick={handleMagicFill}
              disabled={aiLoading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center gap-2 hover:from-blue-100 hover:to-indigo-100 transition-all font-medium shadow-sm"
            >
              {aiLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Analizando imagen...
                </>
              ) : (
                <>
                  <Wand2 size={18} className="text-indigo-600" /> Autocompletar con IA
                </>
              )}
            </button>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del Producto</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              placeholder="Ej: Campera de Jean Vintage"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
            <input
              type="number"
              required
              min="0"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              placeholder="0.00"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-24 resize-none outline-none transition-shadow"
              placeholder="Detalles del producto, estado, talle..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Publicando...
                </>
              ) : (
                'Publicar Producto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
