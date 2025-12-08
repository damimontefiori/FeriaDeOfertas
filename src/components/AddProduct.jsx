import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addProduct } from '../services/db';
import { uploadFile } from '../services/storage';
import { useLogger } from '../context/LoggerContext';
import { PackagePlus, X, Upload, Image as ImageIcon } from 'lucide-react';

const AddProduct = ({ onClose, onProductAdded }) => {
  const { userProfile } = useAuth();
  const { addLog } = useLogger();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: ''
  });

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del Producto</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
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
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 5000"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              required
              rows="3"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Detalles del estado, talle, medidas..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fotos</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="text-gray-400" size={32} />
                <span className="text-sm text-gray-600">
                  {files.length > 0 
                    ? `${files.length} archivos seleccionados` 
                    : 'Haz clic para subir fotos'}
                </span>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto py-2">
                {files.map((f, i) => (
                  <div key={i} className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                    <ImageIcon size={20} className="text-gray-400"/>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded text-white font-bold ${
                loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
