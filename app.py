import os               # Para leer las variables de entorno
import requests         # Para llamar a la API
from dotenv import load_dotenv # Para cargar el .env
import ast              # Para leer las listas de strings
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# --- Configuración Inicial ---
load_dotenv() # Carga las variables del archivo .env
app = Flask(__name__)
CORS(app) 

# --- Claves de API (Cargadas desde .env) ---
LASTFM_API_KEY = os.environ.get("LASTFM_API_KEY")
USER_AGENT_EMAIL = os.environ.get("USER_AGENT_EMAIL")
LASTFM_URL = "http://ws.audioscrobbler.com/2.0/"


# --- Carga de Datos ---
try:
    df = pd.read_csv('clustered_df_with_genres.csv')
    df['name'] = df['name'].str.strip().str.lower()
    df['popularity'] = pd.to_numeric(df['popularity'], errors='coerce')
    df['year'] = pd.to_numeric(df['year'], errors='coerce')
    df = df.dropna(subset=['popularity', 'year'])
    df['year'] = df['year'].astype(int)
except FileNotFoundError:
    print("ERROR: clustered_df_with_genres.csv no encontrado.")
    df = pd.DataFrame()

# --- Extraer Artistas y Géneros Únicos ---
artists_list = []
genres_list = []
if not df.empty:
    try:
        s_artists = df['artists'].dropna().apply(ast.literal_eval).explode()
        artists_list = sorted(s_artists.str.strip().unique().tolist())
        
        s_genres = df['genres'].dropna().apply(ast.literal_eval).explode()
        genres_list = sorted(s_genres.str.strip().unique().tolist())
    except Exception as e:
        print(f"Error al procesar listas: {e}")

numerical_features = [
    "valence", "danceability", "energy", "tempo",
    "acousticness", "liveness", "speechiness", "instrumentalness"
]

# --- Función Helper para buscar imágenes en Last.fm ---
def get_image_url(song_name, artist_name):
    if not LASTFM_API_KEY:
        return None # No hacer nada si no hay API key

    headers = {
        'User-Agent': f'MiRecomendadorApp {USER_AGENT_EMAIL}'
    }
    
    params = {
        'method': 'track.getInfo',
        'api_key': LASTFM_API_KEY,
        'artist': artist_name,
        'track': song_name,
        'format': 'json'
    }

    try:
        response = requests.get(LASTFM_URL, params=params, headers=headers)
        response.raise_for_status() 
        data = response.json()

        track = data.get('track', {})
        album = track.get('album', {})
        images = album.get('image', [])
        
        if images:
            for img in images:
                if img.get('size') == 'extralarge':
                    return img.get('#text')
            return images[-1].get('#text')

    except requests.exceptions.RequestException as e:
        print(f"Error en API Last.fm (Request): {e}")
    except KeyError:
        print(f"Error en API Last.fm (KeyError) para {song_name}")
    except Exception as e:
        print(f"Error inesperado en get_image_url: {e}")
    
    return None # Devolver None si algo falla

# --- Función Helper para procesar la lista de resultados ---
def fetch_images_for_list(results_list):
    """
    Recibe una lista de diccionarios de canciones, 
    busca la imagen para cada una y la añade.
    """
    for song in results_list:
        try:
            # Extrae el primer artista de la lista (ej. "['Nirvana']" -> "Nirvana")
            artist_name = ast.literal_eval(song['artists'])[0]
        except:
            artist_name = song['artists'] # Fallback por si no es una lista

        # Buscamos la imagen y la añadimos al diccionario
        image_url = get_image_url(song['name'], artist_name)
        song['imageUrl'] = image_url
    return results_list


# --- RUTA 1: Obtener los filtros (Artistas y Géneros) ---
@app.route("/filters")
def get_filters():
    return jsonify({
        'artists': artists_list,
        'genres': genres_list
    })

# --- RUTA 2: Recomendar por Canción (ACTUALIZADA) ---
@app.route("/recommend-song", methods=["POST"])
def recommend_song_api():
    data = request.get_json()
    if not data or 'song_name' not in data:
        return jsonify({"error": "Falta 'song_name'"}), 400
    
    song_name = data['song_name'].strip().lower()
    
    try:
        song_row = df[df["name"] == song_name]
        if song_row.empty:
            raise ValueError("Canción no encontrada")

        target_cluster = song_row.iloc[0]["Cluster"]
        song_index_in_cluster = song_row.index[0]
        same_cluster_songs = df[df["Cluster"] == target_cluster].copy()
        
        if len(same_cluster_songs) <= 1:
            return jsonify([]) 

        similarity = cosine_similarity(
            same_cluster_songs[numerical_features],
            same_cluster_songs[numerical_features]
        )
        
        similarity_index = same_cluster_songs.index.get_loc(song_index_in_cluster)
        
        similar_songs_relative_indices = np.argsort(similarity[similarity_index])[::-1]
        recommendations = same_cluster_songs.iloc[similar_songs_relative_indices]
        recommendations = recommendations[recommendations.index != song_index_in_cluster]
        
        result_df = recommendations[["name", "year", "artists"]].head(5)
        
        # --- Lógica de Imagen ---
        results_list = result_df.to_dict(orient="records")
        results_with_images = fetch_images_for_list(results_list)
        return jsonify(results_with_images)

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error: {e}"}), 500

# --- RUTA 3: Buscar por Artista (ACTUALIZADA) ---
@app.route("/search-artist", methods=["POST"])
def search_artist_api():
    data = request.get_json()
    if not data or 'artist' not in data:
        return jsonify({"error": "Falta 'artist'"}), 400
    
    selected_artist = data['artist']
    if selected_artist == "Todos":
        return jsonify([])

    mask = df['artists'].str.contains(selected_artist, case=False, na=False)
    result_df = df[mask].sort_values(by="popularity", ascending=False).head(5)
    
    # --- Lógica de Imagen ---
    results_list = result_df[["name", "year", "artists"]].to_dict(orient="records")
    results_with_images = fetch_images_for_list(results_list)
    return jsonify(results_with_images)

# --- RUTA 4: Buscar por Género (ACTUALIZADA) ---
@app.route("/search-genre", methods=["POST"])
def search_genre_api():
    data = request.get_json()
    if not data or 'genre' not in data:
        return jsonify({"error": "Falta 'genre'"}), 400
    
    selected_genre = data['genre']
    if selected_genre == "Todos":
        return jsonify([])

    mask = df['genres'].str.contains(selected_genre, case=False, na=False)
    result_df = df[mask].sort_values(by="popularity", ascending=False).head(5)
    
    # --- Lógica de Imagen ---
    results_list = result_df[["name", "year", "artists"]].to_dict(orient="records")
    results_with_images = fetch_images_for_list(results_list)
    return jsonify(results_with_images)

# --- RUTA 5: Buscar por Año (ACTUALIZADA) ---
@app.route("/search-year", methods=["POST"])
def search_year_api():
    data = request.get_json()
    if not data or 'year' not in data:
        return jsonify({"error": "Falta 'year'"}), 400
    
    try:
        selected_year = int(data['year'])
    except ValueError:
        return jsonify({"error": "El año debe ser un número"}), 400

    mask = df['year'] == selected_year
    result_df = df[mask].sort_values(by="popularity", ascending=False).head(5)
    
    # --- Lógica de Imagen ---
    results_list = result_df[["name", "year", "artists"]].to_dict(orient="records")
    results_with_images = fetch_images_for_list(results_list)
    return jsonify(results_with_images)

if __name__ == '__main__':
    app.run(debug=True, port=5000)