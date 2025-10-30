// src/App.js

import { useState, useEffect } from "react";
import MusicCard from "./components/MusicCard";
import "./App.css";

// Definimos los modos de búsqueda
const SEARCH_MODES = {
  SONG: 'song',
  ARTIST: 'artist',
  GENRE: 'genre',
  YEAR: 'year',
};

function App() {
  // --- Estados del Formulario ---
  const [searchMode, setSearchMode] = useState(SEARCH_MODES.SONG);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("Todos");
  const [selectedGenre, setSelectedGenre] = useState("Todos");
  const [selectedYear, setSelectedYear] = useState("");

  // --- Estados de Listas de Filtros ---
  const [artists, setArtists] = useState([]);
  const [genres, setGenres] = useState([]);

  // --- Estados de Resultados ---
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cargar listas de Artistas y Géneros al inicio
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('http://localhost:5000/filters');
        const data = await response.json();
        setArtists(data.artists);
        setGenres(data.genres);
      } catch (err) {
        console.error("Error al cargar listas de filtros:", err);
      }
    };
    fetchFilters();
  }, []);

  
  // --- Función de Búsqueda (Router) ---
  const handleSearch = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage("");
    setRecommendations([]);

    let url = '';
    let body = {};

    // 1. Determinar qué API llamar basado en searchMode
    switch (searchMode) {
      case SEARCH_MODES.SONG:
        url = 'http://localhost:5000/recommend-song';
        body = { song_name: searchTerm };
        break;
      case SEARCH_MODES.ARTIST:
        url = 'http://localhost:5000/search-artist';
        body = { artist: selectedArtist };
        break;
      case SEARCH_MODES.GENRE:
        url = 'http://localhost:5000/search-genre';
        body = { genre: selectedGenre };
        break;
      case SEARCH_MODES.YEAR:
        url = 'http://localhost:5000/search-year';
        body = { year: selectedYear };
        break;
      default:
        setIsLoading(false);
        return;
    }

    // 2. Hacer la llamada a la API
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }
      
      setRecommendations(data);

      if (data.length === 0) {
        setErrorMessage("No se encontraron resultados para esta búsqueda.");
      }

    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Función de Reset (Actualizada) ---
  const handleReset = () => {
    setSearchTerm("");
    setSelectedArtist("Todos");
    setSelectedGenre("Todos");
    setSelectedYear("");
    setRecommendations([]);
    setHasSearched(false);
    setErrorMessage("");
    // No reseteamos el searchMode
  };

  // --- Función para renderizar el formulario correcto ---
  const renderSearchForm = () => {
    switch (searchMode) {
      case SEARCH_MODES.SONG:
        return (
          <div className="search-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              className="search-input"
              placeholder="Busca una canción para recomendar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        );
      case SEARCH_MODES.ARTIST:
        return (
          <div className="filter-wrapper">
            <select className="filter-select" value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)} disabled={isLoading}>
              <option value="Todos" disabled>Elige un artista...</option>
              {artists.map((artist) => (<option key={artist} value={artist}>{artist}</option>))}
            </select>
          </div>
        );
      case SEARCH_MODES.GENRE:
        return (
          <div className="filter-wrapper">
            <select className="filter-select" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} disabled={isLoading}>
              <option value="Todos" disabled>Elige un género...</option>
              {genres.map((genre) => (<option key={genre} value={genre}>{genre}</option>))}
            </select>
          </div>
        );
      case SEARCH_MODES.YEAR:
        return (
          <div className="filter-wrapper">
            <input
              type="text"
              className="filter-input"
              placeholder="Año (ej: 1995)"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <h3>Recomendador</h3>
          </div>
          
          {/* --- ¡NUEVOS! Botones de Modo de Búsqueda --- */}
          <div className="search-mode-toggles">
            <button 
              className={`search-mode-button ${searchMode === 'song' ? 'active' : ''}`}
              onClick={() => setSearchMode(SEARCH_MODES.SONG)}>
              Por Canción
            </button>
            <button 
              className={`search-mode-button ${searchMode === 'artist' ? 'active' : ''}`}
              onClick={() => setSearchMode(SEARCH_MODES.ARTIST)}>
              Por Artista
            </button>
            <button 
              className={`search-mode-button ${searchMode === 'genre' ? 'active' : ''}`}
              onClick={() => setSearchMode(SEARCH_MODES.GENRE)}>
              Por Género
            </button>
            <button 
              className={`search-mode-button ${searchMode === 'year' ? 'active' : ''}`}
              onClick={() => setSearchMode(SEARCH_MODES.YEAR)}>
              Por Año
            </button>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            {/* El formulario se renderiza dinámicamente aquí */}
            {renderSearchForm()}
            
            <button type="submit" className="search-button" disabled={isLoading}>
              {isLoading ? "Buscando..." : "Buscar"}
            </button>
          </form>

        </div>
      </header>

      <main className="container main-content">
        {/* ... (El resto del JSX (loading, resultados, error) 
               no necesita ningún cambio) ... */}
        
        {/* Estado de Carga */}
        {isLoading && (
          <div className="music-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="music-card skeleton">
                <div className="card-image"></div>
                <div className="card-content">
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text short"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado de Éxito (Resultados) */}
        {!isLoading && hasSearched && recommendations.length > 0 && (
          <div className="results-section">
            <h2 className="results-title">Resultados de la Búsqueda</h2>
            <div className="music-grid">
              {recommendations.map((song, index) => (
                <MusicCard key={index} song={song} />
              ))}
            </div>
          </div>
        )}

        {/* Estado de Error o Sin Resultados */}
        {!isLoading && hasSearched && (errorMessage || recommendations.length === 0) && (
          <div className="empty-state">
            <div className="empty-icon error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>{errorMessage ? "Error" : "No se encontraron resultados"}</h3>
            <p>{errorMessage ? errorMessage : "Intenta con otros filtros o una nueva búsqueda"}</p>
            <button className="reset-button" onClick={handleReset}>
              Limpiar búsqueda
            </button>
          </div>
        )}

        {/* Estado Vacío (Default) */}
        {!isLoading && !hasSearched && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h3>Elige un modo de búsqueda para comenzar</h3>
            <p>Encuentra recomendaciones o explora por artista, género o año.</p>
          </div>
        )}

      </main>
    </div>
  );
}

export default App; 