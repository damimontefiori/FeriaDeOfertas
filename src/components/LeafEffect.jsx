import React, { useEffect, useRef } from 'react';

const LeafEffect = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    let leaves = [];
    let animationFrameId;

    const colors = ['#86efac', '#4ade80', '#fcd34d', '#fdba74']; // Verdes y amarillos suaves

    const resize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.offsetWidth;
        height = canvas.height = canvas.parentElement.offsetHeight;
      }
    };

    class Leaf {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 2;
        this.speedY = Math.random() * 0.5 + 0.2; // Caen más lento que la nieve
        this.speedX = Math.random() * 0.4 - 0.2; // Se mueven un poco a los lados
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.angle = Math.random() * Math.PI * 2;
        this.spin = Math.random() * 0.02 - 0.01;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.angle += this.spin;

        if (this.y > height) {
          this.y = -10;
          this.x = Math.random() * width;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        // Dibujar un óvalo (forma de hoja simple)
        ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
      }
    }

    const init = () => {
      resize();
      leaves = [];
      for (let i = 0; i < 30; i++) { // Menos cantidad que la nieve para no saturar
        leaves.push(new Leaf());
      }
      animate();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      leaves.forEach(leaf => {
        leaf.update();
        leaf.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 opacity-60"
    />
  );
};

export default LeafEffect;
