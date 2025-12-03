# 🔥 Configuração do Firebase para React Native CLI

Este documento descreve como configurar o Firebase nativo no projeto após a migração do Expo.

## 📦 Pacotes Necessários

```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore
npm install @react-native-firebase/storage
```

---

## 🤖 Configuração Android

### 1. Baixar google-services.json

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **crediario-app**
3. Vá em **Project Settings** (ícone de engrenagem)
4. Na seção **Your apps**, selecione o app Android ou adicione um novo
5. Baixe o arquivo `google-services.json`
6. Copie para: `android/app/google-services.json`

### 2. Configurar build.gradle (Projeto)

Edite `android/build.gradle`:

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 23
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
        kotlinVersion = "1.9.22"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")

        // 🔥 Adicione esta linha
        classpath('com.google.gms:google-services:4.4.0')
    }
}
```

### 3. Configurar build.gradle (App)

Edite `android/app/build.gradle`:

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// 🔥 Adicione esta linha no final do arquivo
apply plugin: 'com.google.gms.google-services'
```

### 4. Verificar AndroidManifest.xml

Certifique-se de que `android/app/src/main/AndroidManifest.xml` tem as permissões necessárias:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:allowBackup="false"
      android:theme="@style/AppTheme">

      <!-- Suas activities aqui -->

    </application>
</manifest>
```

### 5. Limpar e Reconstruir

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## 🍎 Configuração iOS

### 1. Baixar GoogleService-Info.plist

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **crediario-app**
3. Vá em **Project Settings** (ícone de engrenagem)
4. Na seção **Your apps**, selecione o app iOS ou adicione um novo
5. Baixe o arquivo `GoogleService-Info.plist`
6. Copie para: `ios/GoogleService-Info.plist`

### 2. Adicionar ao Xcode

1. Abra o projeto no Xcode:
   ```bash
   cd ios
   open Crediario.xcworkspace
   ```
2. Arraste `GoogleService-Info.plist` para o projeto no Xcode
3. Certifique-se de marcar **"Copy items if needed"**
4. Selecione o target correto do app

### 3. Instalar Pods

```bash
cd ios
pod install
cd ..
```

### 4. Configurar Info.plist (opcional)

Se necessário, adicione permissões em `ios/Crediario/Info.plist`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Precisamos acessar sua galeria para anexar fotos</string>

<key>NSCameraUsageDescription</key>
<string>Precisamos acessar sua câmera para tirar fotos</string>
```

### 5. Reconstruir

```bash
npx react-native run-ios
```

---

## 🧪 Testar a Configuração

Crie um arquivo de teste temporário para verificar se o Firebase está funcionando:

```typescript
// test-firebase.ts
import { firebaseAuth, db, firebaseStorage } from './src/firebaseConfig';

async function testFirebase() {
  try {
    console.log('🔥 Testando Firebase Auth:', firebaseAuth.currentUser);
    console.log('🔥 Testando Firestore:', db);
    console.log('🔥 Testando Storage:', firebaseStorage);
    console.log('✅ Firebase configurado corretamente!');
  } catch (error) {
    console.error('❌ Erro ao testar Firebase:', error);
  }
}

testFirebase();
```

Execute o app e verifique o console.

---

## 🚨 Problemas Comuns

### Erro: "google-services.json not found"

**Solução:**
```bash
# Verifique se o arquivo está no local correto
ls android/app/google-services.json

# Se não estiver, baixe do Firebase Console e copie para android/app/
```

### Erro: "GoogleService-Info.plist not found"

**Solução:**
```bash
# Verifique se o arquivo está no local correto
ls ios/GoogleService-Info.plist

# Se não estiver, baixe do Firebase Console e copie para ios/
# Depois adicione ao projeto no Xcode
```

### Erro: "Default FirebaseApp is not initialized"

**Solução Android:**
```bash
# Verifique se apply plugin: 'com.google.gms.google-services' está no final de android/app/build.gradle
# Limpe e reconstrua
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

**Solução iOS:**
```bash
# Reinstale os pods
cd ios && pod deintegrate && pod install && cd ..
npx react-native run-ios
```

### Erro: "Duplicate class found"

**Solução:**
```bash
# Limpe o cache e reconstrua
cd android
./gradlew clean
cd ..
npm start -- --reset-cache
npx react-native run-android
```

---

## 📚 Estrutura do Projeto

```
crediario-nativo/
├── android/
│   ├── app/
│   │   ├── google-services.json        ← Arquivo de config Android
│   │   └── build.gradle                ← Configurar aqui
│   └── build.gradle                    ← Adicionar plugin aqui
├── ios/
│   ├── GoogleService-Info.plist        ← Arquivo de config iOS
│   └── Crediario.xcworkspace           ← Abrir no Xcode
└── src/
    └── firebaseConfig.ts               ← Configuração do Firebase
```

---

## 🔗 Informações do Projeto Firebase

**Nome do Projeto:** crediario-app
**Project ID:** crediario-app
**Storage Bucket:** crediario-app.firebasestorage.app

**Configuração (referência):**
```javascript
{
  apiKey: "AIzaSyAzQcyWf2argX07xwZaEpWmht7Ty74haHI",
  authDomain: "crediario-app.firebaseapp.com",
  projectId: "crediario-app",
  storageBucket: "crediario-app.firebasestorage.app",
  messagingSenderId: "464413033372",
  appId: "1:464413033372:web:67344359b50089bc3ffe59",
}
```

---

## 📖 Referências

- [React Native Firebase - Documentação Oficial](https://rnfirebase.io/)
- [Firebase Console](https://console.firebase.google.com/)
- [Guia de Instalação Android](https://rnfirebase.io/docs/android/installation)
- [Guia de Instalação iOS](https://rnfirebase.io/docs/ios/installation)

---

✅ **Configuração concluída!** O Firebase agora está 100% nativo e compatível com React Native CLI.
