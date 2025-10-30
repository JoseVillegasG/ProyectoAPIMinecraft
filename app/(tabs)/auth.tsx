// app/(tabs)/auth.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp, signIn, user, logOut } = useAuth();

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAuth = async () => {
    // Validations
    if (!email || !password) {
      showAlert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      showAlert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      showAlert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        showAlert('Éxito', 'Has iniciado sesión correctamente');
      } else {
        await signUp(email, password);
        showAlert('Éxito', 'Cuenta creada correctamente');
      }
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showAlert('Error', error.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      showAlert('Éxito', 'Has cerrado sesión');
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  // Render for web
  if (Platform.OS === 'web') {
    if (user) {
      return (
        <div style={webStyles.container}>
          <div style={webStyles.header}>
            <h1 style={webStyles.headerTitle}>Autenticación</h1>
          </div>
          <div style={webStyles.content}>
            <div style={webStyles.card}>
              <h2 style={webStyles.title}>Perfil</h2>
              <div style={webStyles.infoRow}>
                <span style={webStyles.label}>Email:</span>
                <span style={webStyles.value}>{user.email}</span>
              </div>
              <div style={webStyles.infoRow}>
                <span style={webStyles.label}>UID:</span>
                <span style={webStyles.value}>{user.uid}</span>
              </div>
              <button
                style={webStyles.logoutButton}
                onClick={handleLogout}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={webStyles.container}>
        <div style={webStyles.header}>
          <h1 style={webStyles.headerTitle}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
        </div>
        <div style={webStyles.content}>
          <div style={webStyles.card}>
            <h2 style={webStyles.title}>
              {isLogin ? 'Bienvenido' : 'Registro'}
            </h2>

            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={webStyles.input}
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={webStyles.input}
              disabled={loading}
            />

            {!isLogin && (
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={webStyles.input}
                disabled={loading}
              />
            )}

            <button
              style={{
                ...webStyles.button,
                ...(loading ? webStyles.buttonDisabled : {}),
              }}
              onClick={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <span>Cargando...</span>
              ) : (
                <span>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</span>
              )}
            </button>

            <button
              style={webStyles.switchButton}
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              disabled={loading}
            >
              {isLogin
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render for mobile (original code)
  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.profileCard}>
          <Text style={styles.title}>Perfil</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>UID:</Text>
            <Text style={styles.value}>{user.uid}</Text>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.title}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Mobile Styles (React Native)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#1976d2',
    fontSize: 14,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

// Web Styles (CSS-in-JS)
const webStyles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#1976d2',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  },
  content: {
    paddingTop: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 64px)',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: 420,
    margin: '0 20px',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center' as const,
    marginTop: 0,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #ddd',
    borderRadius: 8,
    marginBottom: 16,
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  button: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#1976d2',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  logoutButton: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#d32f2f',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 20,
    fontFamily: 'inherit',
  },
  switchButton: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    color: '#1976d2',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginTop: 16,
    fontFamily: 'inherit',
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    display: 'block',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    display: 'block',
  },
};