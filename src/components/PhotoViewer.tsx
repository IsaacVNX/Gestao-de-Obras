'use client';

import { X } from 'lucide-react';
import { Button } from './ui/button';

interface PhotoViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function PhotoViewer({ imageUrl, onClose }: PhotoViewerProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in-0"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white z-10"
      >
        <X className="h-6 w-6" />
        <span className="sr-only">Fechar</span>
      </Button>
      <div className="relative p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt="Visualização da foto do produto"
          className="max-h-[90vh] max-w-[90vw] w-auto h-auto rounded-md object-contain"
        />
      </div>
    </div>
  );
}
