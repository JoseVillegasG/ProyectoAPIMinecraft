import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function HomeScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<any>(null);
  const isWeb = Platform.OS === "web";

  const [username, setUsername] = useState("");
  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // skin desde el nombre del jugador
  const fetchSkin = async () => {
    if (!username) {
      Alert.alert("Error", "Por favor ingresa un nombre de jugador.");
      return;
    }

    setLoading(true);
    try {
      //  UUID
      const profileRes = await fetch(
        `https://corsproxy.io/?https://api.mojang.com/users/profiles/minecraft/${username}`
      );
      if (!profileRes.ok) throw new Error("Jugador no encontrado");
      const profileData = await profileRes.json();
      const uuid = profileData.id;

      //Obtener texturas
      const textureRes = await fetch(
        `https://corsproxy.io/?https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
      );
      const textureData = await textureRes.json();

      //  base64
      const encodedValue = textureData.properties[0].value;
      const decoded = JSON.parse(atob(encodedValue));

      // Obtener URL del skin
      const skin = decoded.textures?.SKIN?.url;
      if (!skin) throw new Error("No se encontró la skin");

      setSkinUrl(skin);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "No se pudo obtener la skin");
    } finally {
      setLoading(false);
    }
  };

  // cargar skin en web con skinview3d
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

        <div style={{ paddingTop: 80, paddingLeft: 24, paddingRight: 24 }}>
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
              <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
                Ingresa el nombre exacto del jugador de Minecraft.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expo Go
  const skinPreview = skinUrl
    ? `https://mc-heads.net/body/${skinUrl.split("/").pop()}/400`
    : null;

  return (
    <View style={styles.container}>
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
        </View>
      </View>
    </View>
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
});
