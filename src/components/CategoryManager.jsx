import React, { useRef, useState } from 'react';
import { getShopProducts, updateShopCategories, batchUpdateProductCategories, clearCategoryFromProducts, renameCategory } from '../services/db';
import { useLogger } from '../context/LoggerContext';
import { MAX_VISIBLE_CATEGORY_PILLS } from './ProductList';
import { Plus, Tag, Wand2, Loader2, Trash2, Pencil, Check, X, ArrowUpDown, ChevronUp, ChevronDown, ArrowUpToLine, ArrowDownToLine, Undo2 } from 'lucide-react';

export const MAX_CATEGORIES = 30;
const MAX_CATEGORY_LENGTH = 30;

// Pestaña "Categorías" del modal de configuración: alta, edición, borrado y sugerencia con IA.
const CategoryManager = ({ shopData, onCategoriesChange, onProductsChanged }) => {
  const { addLog } = useLogger();
  const categories = shopData.categories || [];

  const [categoryInput, setCategoryInput] = useState('');
  const [aiCategoriesLoading, setAiCategoriesLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { categories, assignments }
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null); // { name, count } para el popup de confirmación
  const [editingCategory, setEditingCategory] = useState(null); // { original, value }
  const [savingRename, setSavingRename] = useState(false);
  const [reordering, setReordering] = useState(false); // modo "Ordenar"
  const [orderAtStart, setOrderAtStart] = useState(null); // orden al entrar en "Ordenar", para "Deshacer cambios"
  const [selectedToMove, setSelectedToMove] = useState([]);
  const orderSaveSeqRef = useRef(0);

  const existsCategory = (name, except = null) =>
    categories.some(c => c !== except && c.toLowerCase() === name.toLowerCase());

  const handleAddCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    if (categories.length >= MAX_CATEGORIES) {
      alert(`Máximo ${MAX_CATEGORIES} categorías permitidas.`);
      return;
    }
    if (existsCategory(trimmed)) {
      alert('Esa categoría ya existe.');
      return;
    }
    const updated = [...categories, trimmed];
    updateShopCategories(shopData.id, updated).then(() => {
      onCategoriesChange(updated);
      setCategoryInput('');
      addLog(`Categoría "${trimmed}" agregada`, 'success');
    }).catch(err => {
      addLog(`Error al agregar categoría: ${err.message}`, 'error');
    });
  };

  const handleStartEdit = (categoryName) => {
    setDeletingCategory(null);
    setEditingCategory({ original: categoryName, value: categoryName });
  };

  const handleSaveRename = async () => {
    if (!editingCategory || savingRename) return;
    const { original } = editingCategory;
    const trimmed = editingCategory.value.trim();
    if (!trimmed) return;
    if (trimmed === original) {
      setEditingCategory(null);
      return;
    }
    // Se permite cambiar solo mayúsculas/minúsculas de la misma categoría
    if (existsCategory(trimmed, original)) {
      alert('Ya existe una categoría con ese nombre.');
      return;
    }

    setSavingRename(true);
    try {
      const updated = await renameCategory(shopData.id, categories, original, trimmed);
      onCategoriesChange(updated);
      onProductsChanged();
      setEditingCategory(null);
      addLog(`Categoría "${original}" renombrada a "${trimmed}"`, 'success');
    } catch (err) {
      addLog(`Error al renombrar categoría: ${err.message}`, 'error');
      alert('No se pudo renombrar la categoría. Intentá de nuevo.');
    } finally {
      setSavingRename(false);
    }
  };

  const handleDeleteCategoryClick = async (categoryName) => {
    setEditingCategory(null);
    // Contar productos con esta categoría
    try {
      const products = await getShopProducts(shopData.id);
      const count = products.filter(p => p.category === categoryName).length;
      if (count === 0) {
        // Borrar directamente
        const updated = categories.filter(c => c !== categoryName);
        await updateShopCategories(shopData.id, updated);
        onCategoriesChange(updated);
        addLog(`Categoría "${categoryName}" eliminada`, 'info');
      } else {
        setDeletingCategory({ name: categoryName, count });
      }
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await clearCategoryFromProducts(shopData.id, deletingCategory.name);
      const updated = categories.filter(c => c !== deletingCategory.name);
      await updateShopCategories(shopData.id, updated);
      onCategoriesChange(updated);
      onProductsChanged();
      addLog(`Categoría "${deletingCategory.name}" eliminada. ${deletingCategory.count} productos pasaron a "Sin categoría".`, 'info');
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setDeletingCategory(null);
    }
  };

  // ---- Ordenar ----
  // El orden de shops.categories es el que ven los compradores (pastillas del catálogo) y el del selector del alta.
  // Cada movimiento se guarda al instante: primero se actualiza la pantalla y, si Firestore falla, se vuelve atrás.
  const saveOrder = async (updated) => {
    const previous = categories;
    const seq = ++orderSaveSeqRef.current;
    onCategoriesChange(updated);
    try {
      await updateShopCategories(shopData.id, updated);
    } catch (err) {
      addLog(`Error al ordenar categorías: ${err.message}`, 'error');
      // Si hubo otro movimiento después, ese ya guarda el orden completo (incluye este): no se revierte
      if (seq === orderSaveSeqRef.current) {
        onCategoriesChange(previous);
        alert('No se pudo guardar el orden. Revisá tu conexión e intentá de nuevo.');
      }
    }
  };

  const handleStartReorder = () => {
    setEditingCategory(null);
    setDeletingCategory(null);
    setSelectedToMove([]);
    setOrderAtStart(categories);
    setReordering(true);
  };

  const sameOrder = (a, b) => a.length === b.length && a.every((cat, i) => cat === b[i]);
  const orderChanged = reordering && orderAtStart !== null && !sameOrder(orderAtStart, categories);

  const handleFinishReorder = () => {
    if (orderChanged) addLog('Orden de categorías actualizado', 'success');
    setReordering(false);
    setSelectedToMove([]);
    setOrderAtStart(null);
  };

  const toggleSelectedToMove = (name) => {
    setSelectedToMove(prev => (prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]));
  };

  const moveCategory = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const updated = [...categories];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    saveOrder(updated);
  };

  // Lleva las seleccionadas al principio o al final, respetando el orden que tenían entre ellas
  const moveSelected = (toStart) => {
    const selected = categories.filter(c => selectedToMove.includes(c));
    if (selected.length === 0) return;
    const rest = categories.filter(c => !selectedToMove.includes(c));
    saveOrder(toStart ? [...selected, ...rest] : [...rest, ...selected]);
    setSelectedToMove([]);
  };

  const handleUndoReorder = () => {
    // En "Ordenar" no se puede agregar, borrar ni renombrar, pero por las dudas solo se restaura si son las mismas
    if (!orderAtStart || orderAtStart.length !== categories.length || !orderAtStart.every(c => categories.includes(c))) return;
    setSelectedToMove([]);
    saveOrder(orderAtStart);
  };

  const handleSuggestCategories = async () => {
    setAiCategoriesLoading(true);
    setAiSuggestion(null);
    try {
      const products = await getShopProducts(shopData.id);
      if (products.length === 0) {
        alert('No tenés productos publicados para analizar.');
        return;
      }
      const response = await fetch('/.netlify/functions/suggest-categories', {
        method: 'POST',
        body: JSON.stringify({
          products: products.map(p => ({ id: p.id, title: p.title, description: p.description || '' }))
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || 'Error en el servidor');
      }
      const data = await response.json();
      setAiSuggestion(data);
      addLog('Sugerencias de categorías generadas por IA', 'success');
    } catch (err) {
      addLog(`Error IA: ${err.message}`, 'error');
      alert('No se pudieron generar sugerencias. Intentá de nuevo.');
    } finally {
      setAiCategoriesLoading(false);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!aiSuggestion) return;
    try {
      await updateShopCategories(shopData.id, aiSuggestion.categories);
      onCategoriesChange(aiSuggestion.categories);
      addLog('Categorías guardadas', 'success');
      // Preguntar si también quiere asignar los productos
      setShowAssignConfirm(true);
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    }
  };

  const handleConfirmAssignProducts = async () => {
    if (!aiSuggestion?.assignments) return;
    try {
      // Solo se aplican categorías de la lista guardada (sin importar mayúsculas, con el nombre tal cual está en la lista).
      // Si la IA devuelve un nombre que no está, el producto quedaría con una categoría huérfana: se deja sin categoría.
      const validCategories = new Map(aiSuggestion.categories.map(c => [c.toLowerCase(), c]));
      const assignments = Object.entries(aiSuggestion.assignments);
      const updates = assignments
        .map(([productId, category]) => ({
          productId,
          category: typeof category === 'string' ? validCategories.get(category.trim().toLowerCase()) : undefined
        }))
        .filter(update => update.category);
      if (updates.length > 0) {
        await batchUpdateProductCategories(updates);
      }
      onProductsChanged();
      const skipped = assignments.length - updates.length;
      addLog(`Categorías asignadas a ${updates.length} productos${skipped > 0 ? ` (${skipped} quedaron sin categoría)` : ''}`, 'success');
    } catch (err) {
      addLog(`Error asignando: ${err.message}`, 'error');
    } finally {
      setShowAssignConfirm(false);
      setAiSuggestion(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* Sugerencia IA - Solo si no hay categorías */}
      {categories.length === 0 && (
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700 mb-3">
            ¿No sabés qué categorías crear? La IA puede analizar tus productos y sugerirte las mejores.
          </p>
          {!aiSuggestion ? (
            <button
              type="button"
              onClick={handleSuggestCategories}
              disabled={aiCategoriesLoading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg flex items-center justify-center gap-2 font-bold hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
            >
              {aiCategoriesLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Analizando productos...</>
              ) : (
                <><Wand2 size={18} /> Sugerir con IA ✨</>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-indigo-800">Categorías sugeridas:</p>
              <div className="flex flex-wrap gap-2">
                {aiSuggestion.categories.map(cat => (
                  <span key={cat} className="bg-white px-3 py-1.5 rounded-full text-sm font-medium text-indigo-700 border border-indigo-200">
                    {cat}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAcceptSuggestion}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmar asignación de productos */}
      {showAssignConfirm && (
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800 font-medium mb-3">
            ¿Querés que la IA también asigne estas categorías a tus productos existentes?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmAssignProducts}
              className="flex-1 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition-colors text-sm"
            >
              Sí, asignar
            </button>
            <button
              type="button"
              onClick={() => { setShowAssignConfirm(false); setAiSuggestion(null); }}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm"
            >
              No, lo haré manual
            </button>
          </div>
        </div>
      )}

      {/* Lista de categorías */}
      {categories.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="block text-sm font-bold text-[#252D61]">
              {reordering ? 'Ordenar categorías' : 'Categorías actuales'}
            </label>
            {!reordering && categories.length > 1 && (
              <button
                type="button"
                onClick={handleStartReorder}
                className="text-sm font-bold text-[#5A99CB] hover:text-[#252D61] hover:bg-gray-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
              >
                <ArrowUpDown size={16} /> Ordenar
              </button>
            )}
          </div>

          {reordering ? (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Tocá las que quieras mover (por ejemplo, las de la temporada) y llevalas al principio o al final, o movelas de a una con las flechas. Los compradores las ven en este orden. Cada cambio se guarda solo.
                {categories.length > MAX_VISIBLE_CATEGORY_PILLS && ` En el catálogo se ven primero ${MAX_VISIBLE_CATEGORY_PILLS}; el resto, al tocar "más".`}
              </p>
              <ol className="space-y-2">
                {categories.map((cat, index) => {
                  const isSelected = selectedToMove.includes(cat);
                  return (
                    <li
                      key={cat}
                      className={`flex items-center gap-1 p-1 rounded-lg border transition-colors ${
                        isSelected ? 'bg-[#5A99CB]/10 border-[#5A99CB]' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedToMove(cat)}
                          className="w-4 h-4 shrink-0 accent-[#252D61]"
                        />
                        <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">{index + 1}</span>
                        <span className="text-sm font-medium text-gray-700 truncate">{cat}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => moveCategory(index, -1)}
                        disabled={index === 0}
                        className="p-2 rounded-md text-gray-500 hover:bg-white hover:text-[#252D61] transition-colors disabled:text-gray-200 disabled:hover:bg-transparent"
                        aria-label={`Subir ${cat}`}
                        title="Subir"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCategory(index, 1)}
                        disabled={index === categories.length - 1}
                        className="p-2 rounded-md text-gray-500 hover:bg-white hover:text-[#252D61] transition-colors disabled:text-gray-200 disabled:hover:bg-transparent"
                        aria-label={`Bajar ${cat}`}
                        title="Bajar"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Acciones pegadas abajo: con listas largas no hace falta volver a subir después de seleccionar.
                  -bottom-6/-mb-6 compensan el p-6 del contenedor del modal para que la lista no asome por debajo. */}
              <div className="sticky -bottom-6 -mx-6 -mb-6 px-6 pt-3 pb-6 mt-3 bg-white border-t border-gray-100 space-y-2">
                {selectedToMove.length > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{selectedToMove.length} seleccionada{selectedToMove.length > 1 ? 's' : ''}</span>
                      <button type="button" onClick={() => setSelectedToMove([])} className="font-bold hover:text-gray-700">
                        Quitar selección
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveSelected(true)}
                        className="flex-1 py-2.5 bg-[#252D61] text-white rounded-lg font-bold hover:bg-[#1a214d] transition-colors text-sm flex items-center justify-center gap-1.5"
                      >
                        <ArrowUpToLine size={16} /> Al principio
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelected(false)}
                        className="flex-1 py-2.5 bg-white text-[#252D61] border border-[#252D61] rounded-lg font-bold hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-1.5"
                      >
                        <ArrowDownToLine size={16} /> Al final
                      </button>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  {orderChanged && (
                    <button
                      type="button"
                      onClick={handleUndoReorder}
                      className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1.5 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Undo2 size={16} /> Deshacer cambios
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFinishReorder}
                    className="ml-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </>
          ) : (
          <>
          <div className="space-y-2">
            {categories.map(cat => (
              editingCategory?.original === cat ? (
                <div key={cat} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border-2 border-[#5A99CB]">
                  <Tag size={14} className="text-[#5A99CB] shrink-0 ml-1" />
                  <input
                    type="text"
                    autoFocus
                    maxLength={MAX_CATEGORY_LENGTH}
                    aria-label={`Nuevo nombre para ${cat}`}
                    className="flex-1 min-w-0 p-1.5 text-base outline-none bg-transparent"
                    value={editingCategory.value}
                    disabled={savingRename}
                    onChange={e => setEditingCategory({ ...editingCategory, value: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveRename(); }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingCategory(null); }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    disabled={savingRename || !editingCategory.value.trim()}
                    className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors disabled:text-gray-300"
                    title="Guardar nombre"
                  >
                    {savingRename ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    disabled={savingRename}
                    className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Cancelar"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div key={cat} className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2 min-w-0">
                    <Tag size={14} className="text-[#5A99CB] shrink-0" />
                    <span className="truncate">{cat}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="text-gray-400 hover:text-[#252D61] transition-colors p-1"
                      title="Editar categoría"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategoryClick(cat)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      title="Eliminar categoría"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Los compradores ven las categorías en este orden{categories.length > 1 ? ' (cambialo con "Ordenar")' : ''}. Al renombrar una categoría, sus productos se actualizan automáticamente.
          </p>
          </>
          )}
        </div>
      )}

      {/* Confirmar borrado de categoría */}
      {deletingCategory && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <p className="text-sm text-red-800 mb-3">
            La categoría <strong>"{deletingCategory.name}"</strong> está asignada a <strong>{deletingCategory.count} producto{deletingCategory.count > 1 ? 's' : ''}</strong>. Si la eliminás, esos productos pasarán a "Sin categoría". ¿Continuar?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmDeleteCategory}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors text-sm"
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => setDeletingCategory(null)}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Agregar categoría (oculto mientras se ordena) */}
      {!reordering && categories.length < MAX_CATEGORIES && (
        <div>
          <label className="block text-sm font-bold text-[#252D61] mb-1.5">Agregar categoría</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: Ropa, Electrónica..."
              maxLength={MAX_CATEGORY_LENGTH}
              className="flex-1 min-w-0 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A99CB] focus:border-[#5A99CB] outline-none transition-all text-base bg-gray-50 focus:bg-white"
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={!categoryInput.trim()}
              className="px-4 py-3 bg-[#252D61] text-white rounded-lg font-bold hover:bg-[#1a214d] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Agregar categoría"
            >
              <Plus size={20} />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">{categories.length}/{MAX_CATEGORIES} categorías</p>
        </div>
      )}

      {!reordering && categories.length >= MAX_CATEGORIES && (
        <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded border border-orange-100">
          Alcanzaste el máximo de {MAX_CATEGORIES} categorías. Eliminá alguna para agregar nuevas.
        </p>
      )}
    </div>
  );
};

export default CategoryManager;
