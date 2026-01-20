# 🎮 API de Gamepasses de Roblox

API para obtener gamepasses de los juegos de usuarios de Roblox.

## 📋 Archivos necesarios

Necesitas crear estos 4 archivos:

1. **server.js** - Código principal de la API
2. **package.json** - Configuración y dependencias
3. **.gitignore** - Archivos a ignorar en Git
4. **README.md** - Este archivo (opcional)

## 🚀 Instalación Local

### 1. Crear carpeta del proyecto
```bash
mkdir roblox-gamepass-api
cd roblox-gamepass-api
```

### 2. Colocar archivos
Coloca todos los archivos descargados en esta carpeta.

### 3. Instalar dependencias
```bash
npm install
```

### 4. Ejecutar la API
```bash
npm start
```

La API estará disponible en `http://localhost:3000`

## 🌐 Desplegar en Render.com

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin TU_REPOSITORIO_GITHUB
git push -u origin main
```

### 2. Conectar en Render.com
1. Ve a [render.com](https://render.com)
2. Crea un nuevo **Web Service**
3. Conecta tu repositorio de GitHub
4. Render detectará automáticamente que es una app Node.js
5. Click en **Deploy**

## 📡 Endpoints

### Obtener gamepasses de un usuario
```
GET /api/user/:userId/gamepasses
```

**Ejemplo:**
```
https://tu-api.onrender.com/api/user/1558070382/gamepasses
```

**Respuesta:**
```json
{
  "success": true,
  "gamepasses": [
    {
      "id": 123456,
      "name": "VIP Pass",
      "price": 100,
      "priceInRobux": 100,
      "image": "...",
      "gameId": 789,
      "gameName": "Mi Juego Genial"
    }
  ],
  "count": 1,
  "gamesCount": 1
}
```

### Obtener gamepasses de un juego específico
```
GET /api/gamepasses/:universeId
```

**Ejemplo:**
```
https://tu-api.onrender.com/api/gamepasses/918484040462
```

## 🔧 Tecnologías

- **Express.js** - Framework web
- **Axios** - Cliente HTTP
- **CORS** - Cross-Origin Resource Sharing
- **RoProxy** - Proxy para APIs de Roblox

## 📝 Notas

- La API usa RoProxy para acceder a las APIs de Roblox sin limitaciones de CORS
- Los gamepasses se obtienen de juegos públicos del usuario
- El límite es de 50 juegos por usuario y 100 gamepasses por juego

## 🤝 Autor

Creado por Giampier para el sistema de regalos de Roblox

## 📄 Licencia

MIT