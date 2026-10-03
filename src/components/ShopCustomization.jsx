import React, { useRef, useState } from 'react';
import { updateShop } from '../services/db';
import { uploadFile, deleteFiles } from '../services/storage';
import { compressImage } from '../utils/image';
import { useImageUrl } from '../hooks/useImageUrl';
import { useLogger } from '../context/LoggerContext';
import { themes } from '../utils/themes';
import { Check, ImagePlus, Loader2, Trash2, LayoutGrid, Grid3x3, ShoppingCart, Store, Palette } from 'lucide-react';

const viewOptions = [
  { value: 'grid', label: 'Vista grande', description: 'Fotos grandes y botones a la vista.', Icon: LayoutGrid },
  { value: 'compact', label: 'Vista compacta', description: 'Más productos por pantalla. Ideal para catálogos grandes.', Icon: Grid3x3 }
];

// Pestaña "Personalizar" del modal de configuración: logo, tema, vista del catálogo y botón Comprar.
// Cada cambio se guarda al instante en la tienda.
const ShopCustomization = ({ shopData, onShopUpdated }) => {
  const { addLog } = useLogger();
  const logoUrl = useImageUrl(shopData.logo);
  const fileInputRef = useRef(null);
  const [savingField, setSavingField] = useState(null); // 'logo' | 'theme' | 'defaultView' | 'showBuyButton'

  const currentTheme = shopData.theme || 'classic';
  const currentView = shopData.defaultView || 'grid';
  const showBuyButton = shopData.showBuyButton !== false;
  const hasPaymentData = Boolean(shopData.alias || shopData.cbu);

  const saveShop = async (field, updates, successMessage) => {
    setSavingField(field);
    try {
      await updateShop(shopData.id, updates);
      onShopUpdated(updates);
      addLog(successMessage, 'success');
      return true;
    } catch (error) {
      console.error("Error updating shop:", error);
      addLog(`Error al guardar: ${error.message}`, 'error');
      alert('No se pudo guardar el cambio. Intentá de nuevo.');
      return false;
    } finally {
      setSavingField(null);
    }
  };

  const handleLogoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Permite volver a elegir el mismo archivo
    if (!file) return;

    const previousLogo = shopData.logo;
    let uploadedKey = null;
    let saved = false;
    setSavingField('logo');
    try {
      // PNG para conservar la transparencia del logo
      const compressed = await compressImage(file, { maxSize: 512, type: 'image/png' });
      uploadedKey = await uploadFile(compressed);
      await updateShop(shopData.id, { logo: uploadedKey });
      saved = true;
      onShopUpdated({ logo: uploadedKey });
      addLog('Logo actualizado', 'success');

      if (previousLogo) {
        deleteFiles([previousLogo]).catch(err => {
          addLog(`No se pudo borrar el logo anterior: ${err.message}`, 'error');
        });
      }
    } catch (error) {
      // Si se subió pero no se guardó, nadie referencia esa imagen
      if (uploadedKey && !saved) {
        deleteFiles([uploadedKey]).catch(err => {
          addLog(`No se pudo limpiar el logo subido: ${err.message}`, 'error');
        });
      }
      console.error("Error subiendo logo:", error);
      addLog(`Error al subir el logo: ${error.message}`, 'error');
      alert(`No se pudo subir el logo: ${error.message}`);
    } finally {
      setSavingField(null);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('¿Quitar el logo de la tienda?')) return;
    const previousLogo = shopData.logo;
    const saved = await saveShop('logo', { logo: '' }, 'Logo eliminado');
    if (saved && previousLogo) {
      deleteFiles([previousLogo]).catch(err => {
        addLog(`No se pudo borrar el logo en R2: ${err.message}`, 'error');
      });
    }
  };

  const sectionTitle = "text-sm font-bold text-[#252D61] mb-1";
  const sectionHint = "text-xs text-gray-500 mb-3";

  return (
    <div className="space-y-7">
      <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded border border-blue-100">
        ℹ️ Los cambios de esta pestaña se aplican al instante en tu tienda pública.
      </p>

      {/* LOGO */}
      <section>
        <h4 className={sectionTitle}>Logo</h4>
        <p className={sectionHint}>Se muestra en el encabezado de tu tienda. Ideal: imagen cuadrada, PNG con fondo transparente.</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {savingField === 'logo' ? (
              <Loader2 size={24} className="animate-spin text-gray-400" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo de la tienda" className="w-full h-full object-contain p-1" />
            ) : (
              <Store size={28} className="text-gray-300" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelected}
              className="hidden"
              aria-label="Archivo de logo"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingField !== null}
              className="px-4 py-2 bg-[#252D61] text-white rounded-lg text-sm font-bold hover:bg-[#1a214d] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ImagePlus size={16} /> {shopData.logo ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {shopData.logo && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={savingField !== null}
                className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} /> Quitar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* TEMA */}
      <section>
        <h4 className={`${sectionTitle} flex items-center gap-1.5`}><Palette size={16} className="text-[#5A99CB]" /> Tema</h4>
        <p className={sectionHint}>Cambia los colores del encabezado, el fondo y los filtros de tu tienda.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(themes).map(([key, t]) => {
            const selected = currentTheme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => !selected && saveShop('theme', { theme: key }, `Tema actualizado a: ${t.name}`)}
                disabled={savingField !== null}
                aria-pressed={selected}
                className={`text-left rounded-xl border-2 overflow-hidden transition-all disabled:cursor-wait ${
                  selected ? 'border-blue-500 shadow-md' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Mini vista previa: encabezado + fondo con pastillas */}
                <div className={`h-9 ${t.header}`} />
                <div className={`h-9 ${t.bg} flex items-center gap-1.5 px-2`}>
                  <span className={`h-3 w-8 rounded-full border ${t.pill}`} />
                  <span className="h-3 w-6 rounded-full bg-white border border-gray-200" />
                  <span className="h-3 w-6 rounded-full bg-white border border-gray-200" />
                </div>
                <div className="flex items-center justify-between px-2.5 py-2 bg-white border-t border-gray-100">
                  <span className={`text-sm font-medium truncate ${selected ? 'text-blue-700' : 'text-gray-700'}`}>{t.name}</span>
                  {selected && <Check size={16} className="text-blue-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* VISTA DEL CATÁLOGO */}
      <section>
        <h4 className={sectionTitle}>Vista inicial del catálogo</h4>
        <p className={sectionHint}>Cómo ven tus productos los compradores al entrar. Igual pueden cambiarla con el selector del catálogo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {viewOptions.map(({ value, label, description, Icon }) => {
            const selected = currentView === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => !selected && saveShop('defaultView', { defaultView: value }, `Vista inicial: ${label}`)}
                disabled={savingField !== null}
                aria-pressed={selected}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all disabled:cursor-wait ${
                  selected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <Icon size={22} className={selected ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
                <span>
                  <span className={`block text-sm font-bold ${selected ? 'text-blue-700' : 'text-gray-700'}`}>{label}</span>
                  <span className="block text-xs text-gray-500">{description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* BOTÓN COMPRAR */}
      <section>
        <h4 className={sectionTitle}>Botones de compra</h4>
        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <ShoppingCart size={16} className="text-yellow-500" /> Mostrar botón "Comprar"
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Si lo ocultás, tus compradores solo verán "Preguntar por WhatsApp" y coordinás todo por chat.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showBuyButton}
            aria-label='Mostrar botón "Comprar"'
            onClick={() => saveShop(
              'showBuyButton',
              { showBuyButton: !showBuyButton },
              !showBuyButton ? 'Botón "Comprar" visible' : 'Botón "Comprar" oculto'
            )}
            disabled={savingField !== null}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${showBuyButton ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${showBuyButton ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {showBuyButton && !hasPaymentData && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-100">
            No cargaste Alias ni CBU: "Comprar" abre WhatsApp directamente. Podés cargarlos en la pestaña Datos.
          </p>
        )}
      </section>
    </div>
  );
};

export default ShopCustomization;
