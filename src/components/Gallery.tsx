
import React from 'react';
import { Image } from '../types';

interface GalleryProps {
  images: Image[];
}

const Gallery: React.FC<GalleryProps> = ({ images }) => {
  if (!images || images.length === 0) {
    return <p>Nenhuma imagem disponível.</p>;
  }

  return (
    <section id="gallery" className="container mx-auto mb-16">
       <h2 className="text-3xl font-bold text-center text-teal-700 mb-8">Nossa Estrutura</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[0]?.url} alt={images[0]?.alt} />
          </div>
          <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[1]?.url} alt={images[1]?.alt} />
          </div>
        </div>
        <div className="grid gap-4">
           <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[2]?.url} alt={images[2]?.alt} />
          </div>
           <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[3]?.url} alt={images[3]?.alt} />
          </div>
        </div>
        <div className="grid gap-4">
           <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[4]?.url} alt={images[4]?.alt} />
          </div>
           <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[5]?.url} alt={images[5]?.alt} />
          </div>
        </div>
         <div className="grid gap-4">
           <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[6]?.url} alt={images[6]?.alt} />
          </div>
           <div className="overflow-hidden rounded-xl shadow-lg">
            <img className="h-auto max-w-full rounded-lg hover:scale-110 transition-transform duration-500 cursor-pointer" src={images[7]?.url} alt={images[7]?.alt} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gallery;
