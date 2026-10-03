import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch 
} from "firebase/firestore";
import { db } from "./firebase";

// --- USERS ---

export const createUserProfile = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    });
  }
  return userRef;
};

export const getUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

// --- SHOPS ---

// Helper para generar ID amigable
const generateShopId = (name) => {
  const cleanName = name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${cleanName}-${suffix}`;
};

export const createShop = async (userId, shopData) => {
  // 1. Generamos ID amigable
  const customId = generateShopId(shopData.name);
  const shopRef = doc(db, "shops", customId);

  // 2. Formateo Simple: Limpiamos y agregamos 549
  const cleanNumber = shopData.whatsapp.replace(/\D/g, ''); 
  const finalWhatsapp = `549${cleanNumber}`;

  // 3. Creamos el documento con setDoc
  await setDoc(shopRef, {
    ownerId: userId,
    name: shopData.name,
    description: shopData.description || "",
    whatsapp: finalWhatsapp,
    location: shopData.location,
    alias: shopData.alias || "",
    cbu: shopData.cbu || "",
    createdAt: serverTimestamp(),
    active: true
  });

  // 3. Link shop to user
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { shopId: customId });

  return customId;
};

export const getShopByOwner = async (userId) => {
  const q = query(collection(db, "shops"), where("ownerId", "==", userId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

export const getShopById = async (shopId) => {
  const shopRef = doc(db, "shops", shopId);
  const shopSnap = await getDoc(shopRef);
  return shopSnap.exists() ? { id: shopSnap.id, ...shopSnap.data() } : null;
};

export const updateShop = async (shopId, shopData) => {
  const shopRef = doc(db, "shops", shopId);
  await updateDoc(shopRef, {
    ...shopData,
    updatedAt: serverTimestamp()
  });
};

// --- PRODUCTS ---

export const addProduct = async (shopId, productData) => {
  return await addDoc(collection(db, "products"), {
    shopId,
    title: productData.title,
    description: productData.description,
    price: Number(productData.price),
    condition: productData.condition || 'used',
    category: productData.category || '',
    images: productData.images || [], // Array of R2 URLs
    status: 'available', // available, pending, sold, inactive
    createdAt: serverTimestamp()
  });
};

export const getShopProducts = async (shopId) => {
  const q = query(
    collection(db, "products"), 
    where("shopId", "==", shopId),
    where("status", "in", ["available", "pending", "sold"]) // Incluimos 'sold'
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateProduct = async (productId, productData) => {
  const productRef = doc(db, "products", productId);
  await updateDoc(productRef, {
    title: productData.title,
    description: productData.description,
    price: Number(productData.price),
    condition: productData.condition || 'used',
    category: productData.category || '',
    // Solo actualizamos imágenes si se envían nuevas (o lógica que decidas)
    // Por simplicidad, si envías images, se sobrescriben.
    ...(productData.images && { images: productData.images }),
    updatedAt: serverTimestamp()
  });
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (error) {
    console.error("Error deleting product: ", error);
    throw error;
  }
};

export const updateProductStatus = async (productId, status, buyerInfo = "") => {
  const productRef = doc(db, "products", productId);
  await updateDoc(productRef, { 
    status: status,
    buyerInfo: buyerInfo,
    soldAt: status === 'sold' ? serverTimestamp() : null
  });
};

// --- CATEGORIES ---

export const updateShopCategories = async (shopId, categories) => {
  const shopRef = doc(db, "shops", shopId);
  await updateDoc(shopRef, {
    categories,
    updatedAt: serverTimestamp()
  });
};

export const batchUpdateProductCategories = async (updates) => {
  const batch = writeBatch(db);
  updates.forEach(({ productId, category }) => {
    const productRef = doc(db, "products", productId);
    batch.update(productRef, { category });
  });
  await batch.commit();
};

// Pasa todos los productos de una categoría a otra ('' = sin categoría).
// Firestore admite hasta 500 escrituras por batch: se commitea por tandas.
const reassignProductsCategory = async (shopId, fromCategory, toCategory) => {
  const q = query(
    collection(db, "products"),
    where("shopId", "==", shopId),
    where("category", "==", fromCategory)
  );
  const snapshot = await getDocs(q);
  for (let i = 0; i < snapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 500).forEach(d => {
      batch.update(d.ref, { category: toCategory });
    });
    await batch.commit();
  }
};

export const clearCategoryFromProducts = (shopId, categoryName) =>
  reassignProductsCategory(shopId, categoryName, '');

// Renombra una categoría manteniendo su posición y migra sus productos.
// Primero los productos: si se corta a mitad de camino, repetir el renombre completa lo que faltó.
export const renameCategory = async (shopId, categories, oldName, newName) => {
  await reassignProductsCategory(shopId, oldName, newName);
  const updated = categories.map(c => (c === oldName ? newName : c));
  await updateShopCategories(shopId, updated);
  return updated;
};

// --- ORDERS (Simple flow) ---

export const createOrder = async (buyerId, product, shop) => {
  // This is called when user clicks "Pay with MercadoPago"
  // We reserve the product temporarily or just log the intent
  return await addDoc(collection(db, "orders"), {
    buyerId,
    shopId: shop.id,
    productId: product.id,
    productTitle: product.title,
    price: product.price,
    status: 'pending_payment',
    createdAt: serverTimestamp()
  });
};
