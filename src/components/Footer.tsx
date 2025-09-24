
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-800 text-stone-300 mt-16">
      <div className="container mx-auto px-4 py-6 text-center">
        <p>&copy; {new Date().getFullYear()} Pousada Oásis. Todos os direitos reservados.</p>
        <p className="text-sm text-stone-400 mt-1">Feito com ❤️ para uma estadia inesquecível.</p>
      </div>
    </footer>
  );
};

export default Footer;
