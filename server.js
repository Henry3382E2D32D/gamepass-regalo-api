// ====================================
// API DE GAMEPASSES DE ROBLOX v3.0
// MÉTODO ALTERNATIVO - USA PLACEID EN LUGAR DE UNIVERSEID
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
// FUNCIÓN: Obtener TODAS las experiencias con placeId
// ====================================
async function getAllUserGames(userId) {
    const allGames = [];
    let cursor = null;
    let pageNumber = 1;
    
    console.log(`📚 Obteniendo TODAS las experiencias del usuario ${userId}...`);
    
    do {
        try {
            const url = `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc${cursor ? `&cursor=${cursor}` : ''}`;
            console.log(`   📄 Página ${pageNumber}: Solicitando...`);
            
            const response = await axios.get(url);
            const data = response.data;
            
            if (data && data.data) {
                // Extraer placeId de cada juego
                for (const game of data.data) {
                    const placeId = game.rootPlace ? game.rootPlace.id : null;
                    if (placeId) {
                        allGames.push({
                            universeId: game.id,
                            placeId: placeId,
                            name: game.name
                        });
                    }
                }
                console.log(`      ✅ Encontrados ${data.data.length} juegos en esta página (Total: ${allGames.length})`);
            }
            
            cursor = data.nextPageCursor;
            pageNumber++;
            
            if (cursor) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            console.error(`   ❌ Error en página ${pageNumber}:`, error.message);
            break;
        }
    } while (cursor);
    
    console.log(`📊 TOTAL DE JUEGOS ENCONTRADOS: ${allGames.length}`);
    return allGames;
}

// ====================================
// FUNCIÓN: Obtener gamepasses usando PLACEID (método alternativo)
// ====================================
async function getGamePassesByPlaceId(placeId, gameName) {
    console.log(`📦 Método ALTERNATIVO: Buscando gamepasses por placeId ${placeId}`);
    
    try {
        // MÉTODO ALTERNATIVO 1: Economy API de Roblox
        const url = `https://economy.roblox.com/v2/assets/${placeId}/details`;
        console.log(`   📡 Intentando Economy API...`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.data && response.data.GamePasses) {
            console.log(`   ✅ Encontrados gamepasses vía Economy API`);
            return response.data.GamePasses;
        }
        
    } catch (error) {
        console.log(`   ⚠️ Economy API falló: ${error.message}`);
    }
    
    // MÉTODO ALTERNATIVO 2: Catalog API
    try {
        const url = `https://catalog.roblox.com/v1/search/items?category=GamePass&keyword=${gameName}&limit=30`;
        console.log(`   📡 Intentando Catalog API...`);
        
        const response = await axios.get(url, {
            timeout: 10000
        });
        
        if (response.data && response.data.data) {
            console.log(`   ✅ Encontrados gamepasses vía Catalog API`);
            return response.data.data;
        }
        
    } catch (error) {
        console.log(`   ⚠️ Catalog API falló: ${error.message}`);
    }
    
    return [];
}

// ====================================
// FUNCIÓN: Obtener gamepasses por universeId (método principal mejorado)
// ====================================
async function getGamePassesByUniverseId(universeId, placeId, gameName) {
    console.log(`📦 Buscando gamepasses del juego: ${gameName}`);
    console.log(`   🆔 UniverseId: ${universeId} | PlaceId: ${placeId}`);
    
    // MÉTODO 1: Probar con API v1 directa
    try {
        // Usar games.roblox.com directo (sin roproxy primero)
        const urls = [
            `https://games.roblox.com/v1/games/${universeId}/game-passes?sortOrder=Asc&limit=100`,
            `https://games.roproxy.com/v1/games/${universeId}/game-passes?sortOrder=Asc&limit=100`
        ];
        
        for (const url of urls) {
            try {
                console.log(`   📡 Intentando: ${url.includes('roproxy') ? 'RoProxy' : 'Directo'}`);
                
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    },
                    timeout: 8000
                });
                
                if (response.data && response.data.data && response.data.data.length > 0) {
                    console.log(`   ✅ Éxito! Encontrados ${response.data.data.length} gamepasses`);
                    return response.data.data;
                }
            } catch (err) {
                console.log(`   ⚠️ Falló: ${err.response?.status || err.message}`);
            }
        }
    } catch (error) {
        console.log(`   ⚠️ Método universeId falló completamente`);
    }
    
    // MÉTODO 2: Si falló, intentar con placeId
    if (placeId) {
        console.log(`   🔄 Intentando método alternativo con placeId...`);
        return await getGamePassesByPlaceId(placeId, gameName);
    }
    
    return [];
}

// ====================================
// FUNCIÓN: Obtener detalles de gamepass (precio, etc)
// ====================================
async function getGamePassDetails(passId) {
    try {
        const response = await axios.get(
            `https://apis.roblox.com/game-passes/v1/game-passes/${passId}/product-info`,
            { timeout: 5000 }
        );
        return response.data;
    } catch (error) {
        // Si falla, intentar método alternativo
        try {
            const response = await axios.get(
                `https://economy.roblox.com/v2/assets/${passId}/details`,
                { timeout: 5000 }
            );
            return {
                price: response.data.PriceInRobux || 0,
                isForSale: response.data.IsForSale || false
            };
        } catch (err) {
            return null;
        }
    }
}

// ====================================
// ENDPOINT PRINCIPAL
// ====================================
app.get('/api/user/:userId/gamepasses', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🔍 BUSCANDO GAMEPASSES PARA USUARIO: ${userId}`);
        console.log('═══════════════════════════════════════════════════════');
        
        // Obtener TODOS los juegos del usuario
        const games = await getAllUserGames(userId);
        
        if (games.length === 0) {
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
        
        const allGamepasses = [];
        let gamesWithGamepasses = 0;
        
        // Procesar primeros 20 juegos (para evitar timeout)
        const gamesToProcess = games.slice(0, 20);
        console.log(`⚠️ Procesando solo los primeros ${gamesToProcess.length} juegos para evitar timeout`);
        
        for (let i = 0; i < gamesToProcess.length; i++) {
            const game = gamesToProcess[i];
            
            console.log('');
            console.log(`[${i + 1}/${gamesToProcess.length}] 🎮 ${game.name}`);
            
            try {
                const gamepasses = await getGamePassesByUniverseId(
                    game.universeId,
                    game.placeId,
                    game.name
                );
                
                if (gamepasses.length === 0) {
                    console.log(`   ℹ️ Sin gamepasses`);
                    continue;
                }
                
                gamesWithGamepasses++;
                console.log(`   🎁 Encontrados ${gamepasses.length} gamepasses!`);
                
                for (const pass of gamepasses) {
                    const details = await getGamePassDetails(pass.id || pass.assetId);
                    
                    const gamepassInfo = {
                        id: pass.id || pass.assetId,
                        name: pass.name || pass.Name,
                        displayName: pass.displayName || pass.name || pass.Name,
                        description: pass.description || '',
                        iconImageId: pass.iconImageId || pass.IconImageAssetId,
                        image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id || pass.assetId}`,
                        price: details ? (details.price || details.PriceInRobux || 0) : 0,
                        priceInRobux: details ? (details.price || details.PriceInRobux || 0) : 0,
                        isForSale: details ? (details.isForSale || details.IsForSale || false) : false,
                        gameId: game.universeId,
                        gameName: game.name,
                        placeId: game.placeId
                    };
                    
                    allGamepasses.push(gamepassInfo);
                    console.log(`      ✅ ${gamepassInfo.name}: ${gamepassInfo.price} R$`);
                    
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                console.warn(`   ❌ Error: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 RESUMEN FINAL:`);
        console.log(`   🎮 Juegos totales: ${games.length}`);
        console.log(`   🔍 Juegos analizados: ${gamesToProcess.length}`);
        console.log(`   💎 Juegos con gamepasses: ${gamesWithGamepasses}`);
        console.log(`   🎁 Total de gamepasses: ${allGamepasses.length}`);
        console.log('═══════════════════════════════════════════════════════');

        res.json({
            success: true,
            gamepasses: allGamepasses,
            count: allGamepasses.length,
            gamesCount: games.length,
            gamesAnalyzed: gamesToProcess.length,
            gamesWithGamepasses: gamesWithGamepasses
        });

    } catch (error) {
        console.error('❌ ERROR CRÍTICO:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            gamepasses: [],
            count: 0
        });
    }
});

// ====================================
// ENDPOINT: Gamepasses de un juego específico
// ====================================
app.get('/api/gamepasses/:universeId', async (req, res) => {
    try {
        const universeId = req.params.universeId;
        console.log(`🎮 Buscando gamepasses del juego: ${universeId}`);

        const gamepasses = await getGamePassesByUniverseId(universeId, null, `Game ${universeId}`);
        
        if (gamepasses.length === 0) {
            return res.json({
                success: true,
                gamepasses: [],
                count: 0
            });
        }

        const result = [];
        for (const pass of gamepasses) {
            const details = await getGamePassDetails(pass.id);
            
            result.push({
                id: pass.id,
                name: pass.name,
                price: details ? (details.price || 0) : 0,
                priceInRobux: details ? (details.price || 0) : 0,
                isForSale: details ? (details.isForSale || false) : false,
                image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`
            });
        }

        res.json({
            success: true,
            gamepasses: result,
            count: result.length
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            gamepasses: [],
            count: 0
        });
    }
});

// ====================================
// ENDPOINT DE TEST
// ====================================
app.get('/test/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const games = await getAllUserGames(userId);
        
        res.json({
            success: true,
            userId: userId,
            totalGames: games.length,
            games: games.slice(0, 10).map(g => ({
                universeId: g.universeId,
                placeId: g.placeId,
                name: g.name
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
// ENDPOINT HOME
// ====================================
app.get('/', (req, res) => {
    res.json({
        name: 'API de Gamepasses de Roblox',
        version: '3.0.0 - MÉTODO MEJORADO CON PLACEID',
        status: 'online',
        features: [
            '✅ Usa múltiples métodos de detección',
            '✅ Incluye placeId como fallback',
            '✅ Economy API y Catalog API alternativos',
            '✅ Procesa hasta 20 juegos por request',
            '✅ Manejo robusto de errores'
        ],
        endpoints: {
            userGamepasses: {
                url: '/api/user/:userId/gamepasses',
                method: 'GET',
                example: '/api/user/1558070382/gamepasses'
            },
            gameGamepasses: {
                url: '/api/gamepasses/:universeId',
                method: 'GET',
                example: '/api/gamepasses/4246588339'
            },
            test: {
                url: '/test/:userId',
                method: 'GET',
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
    console.log('✅ API DE GAMEPASSES DE ROBLOX v3.0');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('');
    console.log('🆕 MEJORAS v3.0:');
    console.log('   ✅ Usa placeId como método alternativo');
    console.log('   ✅ Economy API y Catalog API de respaldo');
    console.log('   ✅ Procesa 20 juegos máximo por request');
    console.log('   ✅ Delays optimizados para evitar 429');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});
