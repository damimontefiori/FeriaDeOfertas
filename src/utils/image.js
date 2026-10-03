// Redimensiona y recomprime una imagen en el navegador (canvas) antes de subirla a R2 o mandarla a la IA.
// type: 'image/jpeg' para fotos de producto, 'image/png' para logos (conserva la transparencia).
export const compressImage = (file, { maxSize = 1200, type = 'image/jpeg', quality = 0.8 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('El navegador no pudo leer la imagen.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('No se pudo procesar la imagen.'));
            return;
          }
          // La extensión del nombre define la de la key en R2: que coincida con el contenido real
          const extension = type === 'image/png' ? 'png' : 'jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen';
          resolve(new File([blob], `${baseName}.${extension}`, {
            type,
            lastModified: Date.now(),
          }));
        }, type, quality);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};
