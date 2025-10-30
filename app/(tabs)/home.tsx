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

const API_URL = 'http://localhost:3000'; // Change to your backend URL

interface FavoriteSkin {
  _id?: string;
  username: string;
  skinImage: string;
  addedAt?: Date;
}

export default function HomeScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<any>(null);
  const isWeb = Platform.OS === "web";

  const [username, setUsername] = useState("");
  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [favoriteSkins, setFavoriteSkins] = useState<FavoriteSkin[]>([]);
  const [addingFavorite, setAddingFavorite] = useState(false);

  const { user, logOut } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace('/auth');
    }
  }, [user]);

  // Load favorites on mount
  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/${user?.uid}/favorites`);
      const data = await response.json();
      setFavoriteSkins(data.favoriteSkins || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      router.replace('/auth');
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  // Convert image URL to base64
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Error convirtiendo imagen');
    }
  };

  // Add skin to favorites
  const addToFavorites = async () => {
    if (!skinUrl || !username) {
      if (Platform.OS === 'web') {
        alert('Busca un jugador primero');
      } else {
        Alert.alert('Error', 'Busca un jugador primero');
      }
      return;
    }

    // Check if already favorited
    const alreadyFavorited = favoriteSkins.some(
      fav => fav.username.toLowerCase() === username.toLowerCase()
    );

    if (alreadyFavorited) {
      if (Platform.OS === 'web') {
        alert('Esta skin ya está en favoritos');
      } else {
        Alert.alert('Info', 'Esta skin ya está en favoritos');
      }
      return;
    }

    setAddingFavorite(true);
    try {
      // Convert skin image to base64
      const base64Image = await imageUrlToBase64(skinUrl);

      const response = await fetch(`${API_URL}/api/users/${user?.uid}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          skinImage: base64Image,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error agregando favorito');
      }

      await loadFavorites();
      
      if (Platform.OS === 'web') {
        alert('¡Agregado a favoritos!');
      } else {
        Alert.alert('Éxito', '¡Agregado a favoritos!');
      }
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setAddingFavorite(false);
    }
  };

  // Remove from favorites
  const removeFavorite = async (favUsername: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/users/${user?.uid}/favorites/${favUsername}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Error eliminando favorito');

      await loadFavorites();
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  // Fetch skin from player name
  const fetchSkin = async () => {
    if (!username) {
      if (Platform.OS === 'web') {
        alert("Por favor ingresa un nombre de jugador.");
      } else {
        Alert.alert("Error", "Por favor ingresa un nombre de jugador.");
      }
      return;
    }

    setLoading(true);
    try {
      // Get UUID
      const profileRes = await fetch(
        `https://corsproxy.io/?https://api.mojang.com/users/profiles/minecraft/${username}`
      );
      if (!profileRes.ok) throw new Error("Jugador no encontrado");
      const profileData = await profileRes.json();
      const uuid = profileData.id;

      // Get textures
      const textureRes = await fetch(
        `https://corsproxy.io/?https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
      );
      const textureData = await textureRes.json();

      // Decode base64
      const encodedValue = textureData.properties[0].value;
      const decoded = JSON.parse(atob(encodedValue));

      // Get skin URL
      const skin = decoded.textures?.SKIN?.url;
      if (!skin) throw new Error("No se encontró la skin");

      setSkinUrl(skin);
    } catch (error: any) {
      console.error(error);
      if (Platform.OS === 'web') {
        alert(error.message || "No se pudo obtener la skin");
      } else {
        Alert.alert("Error", error.message || "No se pudo obtener la skin");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load skin on web with skinview3d
  useEffect(() => {
    if (!isWeb || !skinUrl) return;

    let mounted = true;
    (async () => {
      const skinview3d = await import("skinview3d");
      if (!mounted || !canvasRef.current) return;

      if (viewerRef.current) viewerRef.current.dispose?.();

      const viewer = new skinview3d.SkinViewer({
        canvas: canvasRef.current!,
        width: 400,
        height: 400,
      });

      viewerRef.current = viewer;

      try {
        await viewer.loadSkin(skinUrl);
      } catch (e) {
        console.error("Failed to load skin", e);
      }

      if (viewer.controls) viewer.controls.enabled = true;
    })();

    return () => {
      mounted = false;
      if (viewerRef.current) {
        viewerRef.current.dispose?.();
        viewerRef.current = null;
      }
    };
  }, [skinUrl, isWeb]);

  // WEB
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
          }}
        >
          <label
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginLeft: 50,
              lineHeight: "64px",
              color: "#333",
            }}
          >
            Proyecto API Minecraft
          </label>
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

  // Mobile
  const skinPreview = skinUrl
    ? `https://mc-heads.net/body/${skinUrl.split("/").pop()}/400`
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Proyecto API Minecraft</Text>
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
    height: 64,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
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