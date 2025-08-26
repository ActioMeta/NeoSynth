# NeoSynth

Cliente móvil de Navidrome/Subsonic construido con React Native, Expo y TypeScript.

## Características
- Reproducción en streaming y offline
- Playlists offline (usando base de datos Expo)
- Soporte a múltiples servidores Subsonic/Navidrome
- Manejo de lista de reproducción actual (agregar, eliminar, shuffle, aleatorio)
- Zustand para manejo de estado global

## Scripts
- `npm run android` — Ejecuta la app en Android
- `npm run ios` — Ejecuta la app en iOS (requiere macOS)
- `npm run web` — Ejecuta la app en navegador

## Instalación de dependencias
```
npm install
```

## Notas
- Todo el manejo offline se realiza con bases de datos de Expo (expo-sqlite y AsyncStorage).
- El contexto global se maneja con Zustand.
