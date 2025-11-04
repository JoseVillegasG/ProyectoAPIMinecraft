import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";

const API_URL = 'https://proyectoapiminecraft.onrender.com';
const REFRESH_INTERVAL = 5000; 

// Estructura de la data relacionada al listado de skins favoritos
interface FavoriteSkin {
  _id?: string;
  username: string;
  skinImage: string;
  addedAt?: Date;
}

// Hooks
export default function HomeScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWeb = Platform.OS === "web";

  const [username, setUsername] = useState("");
  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [favoriteSkins, setFavoriteSkins] = useState<FavoriteSkin[]>([]);
  const [addingFavorite, setAddingFavorite] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { user, logOut } = useAuth();
  const router = useRouter();

  // Se encarga de mandar al usuario al login si no hay un usuario conectado
  useEffect(() => {
    if (!user) {
      router.replace('/auth');
    }
  }, [user]);

  // Carga las skins favoritas del usuario
  const loadFavorites = async (silent = false) => {
    // Si no hay ususario, cancela operacion
    if (!user) return;
    
    try {
      // Hace fetch a los favoritos del usuario en el mongoDB usando la uid (unica) y la api url que es render.com
      const response = await fetch(`${API_URL}/api/users/${user.uid}/favorites`);
      // Crea una constante llamada data que lee la respuesta del fetch y lo transforma en un json mientras el await detiene todo para poder ver que se pueda leer o no
      const data = await response.json();
      // Pone las skins favoritas del usuaario
      setFavoriteSkins(data.favoriteSkins || []);
      // Muestra el ultimo refresh desde la llamada del fetch (que se hace cada vez que se refresca la pagina, 5 seg aprox.)
      setLastRefresh(new Date());
      // Si se ha renovado la info, avisa de esto
      if (!silent) {
        console.log('Favoritos renovados');
      }
      // Si hay uun error cargando la info, avisa
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    }
  };

  // Hook para cargar favoritos si es que hay usuario
  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  // Auto renovacion 
  useEffect(() => {
    if (user) {
      // Borrar cualquier intervalo para comenzar a contar
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Crear un nuevo intervalo para la info
      refreshIntervalRef.current = setInterval(() => {
        loadFavorites(true); // renovacion para las skins
      }, REFRESH_INTERVAL);

      // Limpia cuando termina el proceso
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [user]);

  // funcion para encargarse de cuando se hace logout considerando intervalos de renovacion
  const handleLogout = async () => {
    try {
      // Limpia los intervalos primero
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      //Espera a la funcion de logout para salir
      await logOut();
      // Cambiar el router devuelta a auth para mandarte devuelta a la pantalla de inicio
      router.replace('/auth');
      // Si hay un error en esto, dependiendo de la plataforma de lo manda con una funcion diferente
    } catch (error: any) {
      if (Platform.OS === 'web') {
        // lo manda por alert de web
        alert('Error: ' + error.message);
      } else {
        // lo manda con el alert integrado en los moviles
        Alert.alert('Error', error.message);
      }
    }
  };

  // Convierte el url en imagen64 para guardado en mongo
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      // Hace fetch al url de la skin con la variable url que seria la url del skin en el input
      const response = await fetch(url);
      const blob = await response.blob();
      //Agrega si se pudo subir y leer el url ya en imagen64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // Regresa para errores
    } catch (error) {
      throw new Error('Error convirtiendo imagen');
    }
  };

  // Agregar una skin a favs
  const addToFavorites = async () => {
    // Tiene que haber una url de skin y un usuario buscado para poder tener la info asi que comprobamos
    if (!skinUrl || !username) {
      // Avisa que se debe tener un usuario buscado
      if (Platform.OS === 'web') {
        alert('Busca un jugador primero');
      } else {
        Alert.alert('Error', 'Busca un jugador primero');
      }
      // Despues de avisar, terminar la constante
      return;
    }

    // Si es que hay un usuario buscado, ahora toca comprobar que dicha skin no este ya en mongo
    // Crea la constante alreadyfavorited que usando la palabra some busca en favoriteskins y si encuentra fav entonces es true
    const alreadyFavorited = favoriteSkins.some(
      fav => fav.username.toLowerCase() === username.toLowerCase()
    );
    // Si la constante alreadyfavorited es true, entonces avisa que ya esta en favoritos
    if (alreadyFavorited) {
      // Avisa en web
      if (Platform.OS === 'web') {
        alert('Esta skin ya está en favoritos');
      } else {
      // Avisa en movil
        Alert.alert('Info', 'Esta skin ya está en favoritos');
      }
      // Despues de avisar, terminar la constante
      return;
    }
    // Si no esta ya favorita y si hay usuario, entonces ya podemos hacerlo fav, esta variable lo confirma e inicia ese otro proceso
    setAddingFavorite(true);
    try {
      // Creamos la variable imag64 que usa la funcion anterior para transformar el url en imag64
      const base64Image = await imageUrlToBase64(skinUrl);
      // Una vez la imag64 hecha, hace un fetch del usuario via uid en el back y hace un post con la imag64
      const response = await fetch(`${API_URL}/api/users/${user?.uid}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          skinImage: base64Image,
        }),
      });
      // Si es que no hubo respuesta exitosa de parte del back, entonces manda un error
      if (!response.ok) {
        // Crea la constante error basada en la respuesta en formato json
        const error = await response.json();
        throw new Error(error.error || 'Error agregando favorito');
      }
      // Una vez la skin agregada al back y en resultado al mongo, llama la funcion para renovar el front
      await loadFavorites(); 
      //Avisos dependiendo de plataforma
      if (Platform.OS === 'web') {
        alert('¡Agregado a favoritos!');
      } else {
        Alert.alert('Éxito', '¡Agregado a favoritos!');
      }
      // Aviso si es que hubo cualquier error
    } catch (error: any) {
      console.error('Error agregando favorito:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } // Despues de todo el proceso vuelve a llamar addingfavorite con falso para esperar otro intento
    finally {
      setAddingFavorite(false);
    }
  };

  // Esta funcion es para remover skins favoritas, recibe un string con el nombre usuario de la skin favorita que quieres borrar
  const removeFavorite = async (favUsername: string) => {
    try {
      // Hace un fetch con el nombre del usuario en la lista de favoritos del usuario y usa el metodo DELETE para borrarlo
      const response = await fetch(
        `${API_URL}/api/users/${user?.uid}/favorites/${favUsername}`,
        { method: 'DELETE' }
      );
      // Si es que no hubo respuesta exitosa, avisa
      if (!response.ok) throw new Error('Error eliminando favorito');
      // Al igual que cuando se agrego una skin, se vuelva a renovar el front con los cambios
      await loadFavorites(); 
      // Si hubo cualquier error, avisa
    } catch (error: any) {
      console.error('Error removiendo favorito:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  // Este es para la busqueda de la skin basada en usuario, probablemente el mas importante
  const fetchSkin = async () => {
    // Checa si no hay usuario ingresado en el textbox antes de intentar
    if (!username) {
      // Avisa si no hay usuario elegido
      if (Platform.OS === 'web') {
        alert("Por favor ingresa un nombre de jugador.");
      } else {
        Alert.alert("Error", "Por favor ingresa un nombre de jugador.");
      }
      return;
    }
    // Pone el estado de carga en true para mostrarlo en busquedaa
    setLoading(true);
    try {
      // Consigue el UUID con un fetch a la api de mojang con la info del textbox
      const profileRes = await fetch(
        `https://corsproxy.io/?https://api.mojang.com/users/profiles/minecraft/${username}`
      );
      // Si no hubo respuesta de perfil, entonces no existe el jugador con ese textbox y avisa
      if (!profileRes.ok) throw new Error("Jugador no encontrado");
      // Si todo bien, entonces la respuesta del perfil lo lee en json y lo guarda en la constante profileData
      const profileData = await profileRes.json();
      // Adicionalmente guardamos en otra variable uuid checando el json y extrayendo el .id
      const uuid = profileData.id;

      // Agarra las texturas del usuario para poder desplegarlo con un fetch buscando con el uuid del usuario
      const textureRes = await fetch(
        `https://corsproxy.io/?https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
      );
      // La respuesta se guarda en un json con las texturas
      const textureData = await textureRes.json();

      // Primero guarda el valor codificado del texture data en su variable de properties
      const encodedValue = textureData.properties[0].value;
      // usamos la funcion atob para decodificarlo a bytes y luego codificarlo a string, parseamos dicho string y lo guardamos en json con la variable decoded
      const decoded = JSON.parse(atob(encodedValue));

      // sacamos la skin ya con el string decodificado y con el resto de la info 
      const skin = decoded.textures?.SKIN?.url;
      // Si no hay skin, avisa
      if (!skin) throw new Error("No se encontró la skin");
      // Llamamos la funcion setSkinUrl con el input de la skin encontrada para poder desplegar la skin
      setSkinUrl(skin);
      // Avisa si hubo un error
    } catch (error: any) {
      console.error(error);
      if (Platform.OS === 'web') {
        alert(error.message || "No se pudo obtener la skin");
      } else {
        Alert.alert("Error", error.message || "No se pudo obtener la skin");
      }
      // Al final de todo el proceso pone devuelta el hook de carga en falso para esperar un nuevo proceso
    } finally {
      setLoading(false);
    }
  };

  // Este efecto carga la skin con skinview3d
  useEffect(() => {
    //Si no es en web o no hay url de la skin, cancela el proceso
    if (!isWeb || !skinUrl) return;
    // Si todo esta bien, comienza el proceso
    let mounted = true;
    (async () => {
      // importa skinview3d y lo guarda en la variable
      const skinview3d = await import("skinview3d");
      // Si es que no hay canvas y no esta montado, cancela
      if (!mounted || !canvasRef.current) return;
      if (viewerRef.current) viewerRef.current.dispose?.();
      // Hace un viewer que despliega la skin en 3d
      const viewer = new skinview3d.SkinViewer({
        canvas: canvasRef.current!,
        width: 400,
        height: 400,
      });

      viewerRef.current = viewer;
      // Carga la skin en el viewer
      try {
        await viewer.loadSkin(skinUrl);
      } catch (e) {
        console.error("Error cargando skin", e);
      }

      if (viewer.controls) viewer.controls.enabled = true;
    })();
    // Regresa la informacion a la normalidad despues de cargar toda la info necesaria
    return () => {
      mounted = false;
      if (viewerRef.current) {
        viewerRef.current.dispose?.();
        viewerRef.current = null;
      }
    };
  }, [skinUrl, isWeb]);

  // Formato para web del front
  if (isWeb) {
    return (
      <div style={{ fontFamily: "sans-serif" }}>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            backgroundColor: "#ccc",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 50,
            paddingRight: 50,
          }}
        >
          <label
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "#333",
            }}
          >
            Proyecto API Minecraft
          </label>
          <div style={{ fontSize: 12, color: "#666" }}>
            Última actualización: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        <div style={{ paddingTop: 80, paddingLeft: 24, paddingRight: 24, paddingBottom: 40 }}>
          <div style={{ display: "flex", gap: 24 }}>
            <canvas
              ref={canvasRef}
              style={{
                width: 400,
                height: 400,
                borderStyle: "solid",
                borderWidth: 2,
                borderColor: "black",
              }}
            />
            <div
              style={{
                width: 320,
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Buscar jugador</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="search"
                  placeholder="Nombre de jugador..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                />
                <button
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#1976d2",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                  onClick={fetchSkin}
                >
                  {loading ? "..." : "Ir"}
                </button>
              </div>
              
              {skinUrl && (
                <button
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: addingFavorite ? "#ccc" : "#FFA500",
                    color: "#fff",
                    cursor: addingFavorite ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onClick={addToFavorites}
                  disabled={addingFavorite}
                >
                  <span style={{ fontSize: 18 }}>⭐</span>
                  {addingFavorite ? "Agregando..." : "Agregar a Favoritos"}
                </button>
              )}
              
              <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
                Ingresa el nombre exacto del jugador de Minecraft.
              </div>
              
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #eee" }}>
                <div style={{ marginBottom: 8, color: "#666", fontSize: 13 }}>
                  Usuario: {user?.email}
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#d32f2f",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  onClick={handleLogout}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          {/* Favorites Section */}
          {favoriteSkins.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>
                Skins Favoritas ({favoriteSkins.length})
              </h2>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {favoriteSkins.map((fav) => (
                  <div
                    key={fav._id || fav.username}
                    style={{
                      background: "#fff",
                      borderRadius: 8,
                      padding: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      textAlign: "center",
                      width: 150,
                    }}
                  >
                    <img
                      src={fav.skinImage}
                      alt={fav.username}
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: "contain",
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      {fav.username}
                    </div>
                    <button
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: 4,
                        border: "none",
                        background: "#d32f2f",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                      onClick={() => removeFavorite(fav.username)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Formato para movil, como en movil no funciona skinview3d, se cambia el proceso a usar mcheads.net
  const skinPreview = skinUrl
    ? `https://mc-heads.net/body/${skinUrl.split("/").pop()}/400`
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Proyecto API Minecraft</Text>
        <Text style={styles.lastUpdate}>
          Última actualización: {lastRefresh.toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#1976d2" />
        ) : skinPreview ? (
          <Image
            source={{ uri: skinPreview }}
            style={styles.skinImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ color: "#555", marginBottom: 20 }}>
            Busca un jugador para ver su skin.
          </Text>
        )}

        <View style={styles.searchBox}>
          <Text style={styles.searchLabel}>Buscar jugador</Text>
          <TextInput
            placeholder="Nombre de jugador..."
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholderTextColor="#777"
          />
          <Button title="Buscar" onPress={fetchSkin} />
          
          {skinUrl && (
            <TouchableOpacity
              style={[styles.starButton, addingFavorite && styles.starButtonDisabled]}
              onPress={addToFavorites}
              disabled={addingFavorite}
            >
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.starButtonText}>
                {addingFavorite ? "Agregando..." : "Agregar a Favoritos"}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.logoutSection}>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Favorites Section */}
        {favoriteSkins.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.favoritesTitle}>
              Skins Favoritas ({favoriteSkins.length})
            </Text>
            <View style={styles.favoritesGrid}>
              {favoriteSkins.map((fav) => (
                <View key={fav._id || fav.username} style={styles.favoriteCard}>
                  <Image
                    source={{ uri: fav.skinImage }}
                    style={styles.favoriteSkinImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.favoriteUsername}>{fav.username}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFavorite(fav.username)}
                  >
                    <Text style={styles.removeButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    height: 80,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    paddingTop: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  lastUpdate: { fontSize: 10, color: "#666", marginTop: 4 },
  content: { padding: 24, alignItems: "center" },
  skinImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 24,
  },
  searchBox: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  searchLabel: { fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  starButton: {
    backgroundColor: "#FFA500",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  starButtonDisabled: {
    backgroundColor: "#ccc",
  },
  starIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  starButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  logoutSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  userEmail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  logoutButton: {
    backgroundColor: "#d32f2f",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  favoritesSection: {
    width: "100%",
    marginTop: 32,
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  favoritesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  favoriteCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    width: 140,
    elevation: 2,
  },
  favoriteSkinImage: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  favoriteUsername: {
    fontWeight: "600",
    marginBottom: 8,
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: "#d32f2f",
    padding: 6,
    borderRadius: 4,
    width: "100%",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});