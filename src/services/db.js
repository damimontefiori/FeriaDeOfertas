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
  serverTimestamp 
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

export const createShop = async (userId, shopData) => {
  // 1. Create the shop document
  const shopRef = await addDoc(collection(db, "shops"), {
    ownerId: userId,
    name: shopData.name,
    description: shopData.description || "",
    whatsapp: shopData.whatsapp,
    location: shopData.location,
    alias: shopData.alias || "", // Nuevo campo
    cbu: shopData.cbu || "",     // Nuevo campo
    createdAt: serverTimestamp(),
    active: true
  });

  // 2. Link shop to user
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { shopId: shopRef.id });

  return shopRef.id;
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

// --- PRODUCTS ---

export const addProduct = async (shopId, productData) => {
  return await addDoc(collection(db, "products"), {
    shopId,
    title: productData.title,
    description: productData.description,
    price: Number(productData.price),
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
