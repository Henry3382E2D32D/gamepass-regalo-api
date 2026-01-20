// ====================================
// API DE GAMEPASSES DE ROBLOX - CON PAGINACIÓN COMPLETA
// ====================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ====================================
// FUNCIÓN: Obtener TODAS las experiencias de un usuario con paginación
// ====================================
async function getAllUserGames(userId) {
    const allGames = [];
    let cursor = null;
    let pageNumber = 1;
    
    console.log(`📚 Obteniendo TODAS las experiencias del usuario ${userId}...`);
    
    do {
        try {
            const url = `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc${cursor ? `&cursor=${cursor}` : ''}`;
            console.log(`   📄 Página ${pageNumber}: ${url}`);
            
            const response = await axios.get(url);
            const data = response.data;
            
            if (data && data.data) {
                allGames.push(...data.data);
                console.log(`      ✅ Encontrados ${data.data.length} juegos en esta página (Total: ${allGames.length})`);
            }
            
            // Obtener el cursor para la siguiente página
            cursor = data.nextPageCursor;
            pageNumber++;
            
            // Delay para no saturar la API
            if (cursor) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
        } catch (error) {
            console.error(`   ❌ Error en página ${pageNumber}:`, error.message);
            break;
        }
    } while (cursor); // Continuar mientras haya más páginas
    
    console.log(`📊 TOTAL DE JUEGOS ENCONTRADOS: ${allGames.length}`);
    return allGames;
}

// ====================================
// FUNCIÓN: Obtener gamepasses de un juego con múltiples métodos
// ====================================
async function getGamePasses(universeId, gameName) {
    console.log(`📦 Buscando gamepasses del juego: ${gameName} (${universeId})`);
    
    let gamepassesData = null;
    
    // MÉTODO 1: Endpoint directo de Roblox
    try {
        const url = `https://games.roblox.com/v1/games/${universeId}/game-passes?sortOrder=Asc&limit=100`;
        console.log(`   📡 Método 1: Endpoint directo`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            },
            timeout: 5000
        });
        
        gamepassesData = response.data;
        console.log(`   ✅ Método 1 exitoso`);
        
    } catch (err) {
        console.log(`   ⚠️ Método 1 falló: ${err.message}`);
        
        // MÉTODO 2: RoProxy (fallback)
        try {
            const url = `https://games.roproxy.com/v1/games/${universeId}/game-passes?sortOrder=Asc&limit=100`;
            console.log(`   📡 Método 2: RoProxy`);
            
            const response = await axios.get(url, {
                timeout: 5000
            });
            
            gamepassesData = response.data;
            console.log(`   ✅ Método 2 exitoso`);
            
        } catch (err2) {
            console.log(`   ⚠️ Método 2 también falló: ${err2.message}`);
            console.log(`   ❌ No se pudieron obtener gamepasses para este juego`);
            return [];
        }
    }
    
    if (!gamepassesData || !gamepassesData.data || gamepassesData.data.length === 0) {
        console.log(`   ℹ️ Este juego no tiene gamepasses`);
        return [];
    }
    
    console.log(`   📊 Encontrados ${gamepassesData.data.length} gamepasses`);
    return gamepassesData.data;
}

// ====================================
// FUNCIÓN: Obtener detalles de un gamepass (precio, etc)
// ====================================
async function getGamePassDetails(passId, passName) {
    try {
        const productUrl = `https://apis.roblox.com/game-passes/v1/game-passes/${passId}/product-info`;
        const response = await axios.get(productUrl, {
            timeout: 5000
        });
        
        return response.data;
    } catch (error) {
        console.warn(`      ⚠️ No se pudieron obtener detalles de ${passName}: ${error.message}`);
        return null;
    }
}

// ====================================
// ENDPOINT PRINCIPAL: Gamepasses de TODAS las experiencias de un usuario
// ====================================
app.get('/api/user/:userId/gamepasses', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🔍 BUSCANDO GAMEPASSES PARA USUARIO: ${userId}`);
        console.log('═══════════════════════════════════════════════════════');
        
        // PASO 1: Obtener TODAS las experiencias del usuario (con paginación)
        const games = await getAllUserGames(userId);
        
        if (games.length === 0) {
            console.log('⚠️ Usuario no tiene juegos públicos');
            return res.json({
                success: true,
                gamepasses: [],
                count: 0,
                gamesCount: 0,
                message: 'Este usuario no tiene juegos públicos'
            });
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🎮 PROCESANDO ${games.length} JUEGOS...`);
        console.log('═══════════════════════════════════════════════════════');
        
        // PASO 2: Obtener gamepasses de cada juego
        const allGamepasses = [];
        let gamesWithGamepasses = 0;
        
        for (let i = 0; i < games.length; i++) {
            const game = games[i];
            const universeId = game.id;
            const gameName = game.name;
            
            console.log('');
            console.log(`[${i + 1}/${games.length}] 🎮 Juego: ${gameName}`);
            
            try {
                // Obtener gamepasses del juego
                const gamepasses = await getGamePasses(universeId, gameName);
                
                if (gamepasses.length === 0) {
                    console.log(`   ℹ️ Sin gamepasses`);
                    continue;
                }
                
                gamesWithGamepasses++;
                
                // Obtener detalles de cada gamepass
                for (const pass of gamepasses) {
                    const details = await getGamePassDetails(pass.id, pass.name);
                    
                    const gamepassInfo = {
                        id: pass.id,
                        name: pass.name,
                        displayName: pass.displayName || pass.name,
                        description: pass.description || '',
                        iconImageId: pass.iconImageId,
                        image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`,
                        price: details ? (details.price || 0) : 0,
                        priceInRobux: details ? (details.price || 0) : 0,
                        isForSale: details ? (details.isForSale || false) : false,
                        gameId: universeId,
                        gameName: gameName
                    };
                    
                    allGamepasses.push(gamepassInfo);
                    console.log(`      ✅ ${pass.name}: ${gamepassInfo.price} R$`);
                    
                    // Delay pequeño entre gamepasses
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (gameError) {
                console.warn(`   ❌ Error procesando juego:`, gameError.message);
            }
            
            // Delay entre juegos para no saturar la API
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 RESUMEN FINAL:`);
        console.log(`   🎮 Juegos analizados: ${games.length}`);
        console.log(`   💎 Juegos con gamepasses: ${gamesWithGamepasses}`);
        console.log(`   🎁 Total de gamepasses: ${allGamepasses.length}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');

        res.json({
            success: true,
            gamepasses: allGamepasses,
            count: allGamepasses.length,
            gamesCount: games.length,
            gamesWithGamepasses: gamesWithGamepasses
        });

    } catch (error) {
        console.error('❌ ERROR CRÍTICO en /api/user/:userId/gamepasses:', error.message);
        console.error(error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            gamepasses: [],
            count: 0
        });
    }
});

// ====================================
// ENDPOINT SECUNDARIO: Gamepasses de un juego específico
// ====================================
app.get('/api/gamepasses/:universeId', async (req, res) => {
    try {
        const universeId = req.params.universeId;
        console.log(`🎮 Buscando gamepasses del juego: ${universeId}`);

        const gamepassesData = await getGamePasses(universeId, `Game ${universeId}`);
        
        if (gamepassesData.length === 0) {
            return res.json({
                success: true,
                gamepasses: [],
                count: 0,
                message: 'Este juego no tiene gamepasses'
            });
        }

        const gamepasses = [];

        // Obtener detalles de cada gamepass
        for (const pass of gamepassesData) {
            const details = await getGamePassDetails(pass.id, pass.name);
            
            gamepasses.push({
                id: pass.id,
                name: pass.name,
                displayName: pass.displayName || pass.name,
                description: pass.description || '',
                iconImageId: pass.iconImageId,
                image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`,
                price: details ? (details.price || 0) : 0,
                priceInRobux: details ? (details.price || 0) : 0,
                isForSale: details ? (details.isForSale || false) : false
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        res.json({
            success: true,
            gamepasses: gamepasses,
            count: gamepasses.length
        });

    } catch (error) {
        console.error('❌ Error en /api/gamepasses/:universeId:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            gamepasses: [],
            count: 0
        });
    }
});

// ====================================
// ENDPOINT DE TEST: Probar con un usuario específico
// ====================================
app.get('/test/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const games = await getAllUserGames(userId);
        
        res.json({
            success: true,
            userId: userId,
            totalGames: games.length,
            games: games.map(g => ({
                id: g.id,
                name: g.name,
                created: g.created,
                updated: g.updated
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ====================================
// ENDPOINT DE INFORMACIÓN
// ====================================
app.get('/', (req, res) => {
    res.json({
        name: 'API de Gamepasses de Roblox',
        version: '2.0.0 - PAGINACIÓN COMPLETA',
        status: 'online',
        features: [
            '✅ Busca TODAS las experiencias del usuario (paginación automática)',
            '✅ Múltiples métodos de fallback para obtener gamepasses',
            '✅ Incluye información de precios',
            '✅ Manejo robusto de errores',
            '✅ Rate limiting automático'
        ],
        endpoints: {
            userGamepasses: {
                url: '/api/user/:userId/gamepasses',
                method: 'GET',
                description: 'Obtiene TODOS los gamepasses de TODAS las experiencias de un usuario',
                example: '/api/user/1558070382/gamepasses',
                note: 'Usa paginación para obtener todas las experiencias, no solo las primeras 50'
            },
            gameGamepasses: {
                url: '/api/gamepasses/:universeId',
                method: 'GET',
                description: 'Obtiene los gamepasses de un juego específico',
                example: '/api/gamepasses/4246588339'
            },
            testUser: {
                url: '/test/:userId',
                method: 'GET',
                description: 'Prueba rápida: ver todas las experiencias de un usuario',
                example: '/test/1558070382'
            }
        }
    });
});

// ====================================
// INICIAR SERVIDOR
// ====================================
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ API DE GAMEPASSES DE ROBLOX v2.0');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log(`   GET /api/user/:userId/gamepasses`);
    console.log(`   GET /api/gamepasses/:universeId`);
    console.log(`   GET /test/:userId`);
    console.log('');
    console.log('🆕 CARACTERÍSTICAS v2.0:');
    console.log('   ✅ Paginación automática (TODAS las experiencias)');
    console.log('   ✅ Sistema de fallback en múltiples niveles');
    console.log('   ✅ Logs detallados y coloridos');
    console.log('   ✅ Rate limiting automático');
    console.log('   ✅ Mejor manejo de errores');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});
