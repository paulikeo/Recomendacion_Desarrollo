// src/components/MusicCard.js

import React from 'react';

// Este es un componente simple para el ícono de música (placeholder)
const MusicIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

// Tu componente MusicCard (ACTUALIZADO)
const MusicCard = ({ song }) => {
  return (
    <div className="music-card">
      <div className="card-image">
        {/* --- ¡NUEVA LÓGICA AQUÍ! --- */}
        {/* Si existe song.imageUrl (y no está vacía), muestra la imagen.*/}
        {/* De lo contrario, muestra el ícono de música como fallback.*/}

        {song.imageUrl ? (
          <img 
            src={song.imageUrl} 
            alt={song.name} 
            className="card-image-real" // Nueva clase CSS
          />
        ) : (
          <MusicIcon />
        )}
      </div>
      <div className="card-content">
        <h3 className="card-title">{song.name}</h3>
        <p className="card-artist">
          {song.artists.replace(/[\[\]']/g, '')} ({song.year})
        </p>
      </div>
    </div>
  );
};

export default MusicCard; 