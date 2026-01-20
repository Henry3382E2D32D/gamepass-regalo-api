// ====================================
// API DE GAMEPASSES DE ROBLOX (VERSIÓN MEJORADA)
// ====================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de axios con timeout
const axiosConfig = {
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0'
    }
};

// ====================================
// FUNCIONES AUXILIARES
// ====================================

// Función para hacer peticiones con reintentos
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`📡 Intento ${i + 1}: ${url}`);
            const response = await axios.get(url, axiosConfig);
            return response;
        } catch (error) {
            console.warn(`⚠️ Intento ${i + 1} falló:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// ====================================
// ENDPOINT PRINCIPAL: Gamepasses de los juegos de un usuario
// ====================================
app.get('/api/user/:userId/gamepasses', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('====================================');
        console.log(`🔍 Buscando gamepasses para userId: ${userId}`);
        console.log('====================================');

        // PASO 1: Obtener todos los juegos del usuario
        const gamesUrl = `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc`;
        const gamesResponse = await fetchWithRetry(gamesUrl);

        if (!gamesResponse.data || !gamesResponse.data.data || gamesResponse.data.data.length === 0) {
            console.log('⚠️ Usuario no tiene juegos públicos');
            return res.json({
                success: true,
                gamepasses: [],
                count: 0,
                gamesCount: 0,
                message: 'Este usuario no tiene juegos públicos'
            });
        }

        const games = gamesResponse.data.data;
        console.log(`✅ Se encontraron ${games.length} juegos del usuario`);
        
        // Mostrar detalles de cada juego
        games.forEach((game, index) => {
            console.log(`   ${index + 1}. ${game.name} (UniverseId: ${game.id})`);
        });

        // PASO 2: Obtener gamepasses de cada juego
        const allGamepasses = [];

        for (const game of games) {
            try {
                const universeId = game.id;
                const gameName = game.name;
                
                console.log(`\n📦 Procesando juego: ${gameName} (${universeId})`);

                // Obtener gamepasses del juego con múltiples endpoints
                let gamepassesData = null;
                
                // Intento 1: Endpoint principal
                try {
                    const url1 = `https://games.roproxy.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
                    const response1 = await fetchWithRetry(url1);
                    gamepassesData = response1.data;
                    console.log(`   ✅ Endpoint 1 exitoso: ${gamepassesData?.data?.length || 0} gamepasses encontrados`);
                } catch (error1) {
                    console.warn(`   ⚠️ Endpoint 1 falló, intentando alternativo...`);
                    
                    // Intento 2: Endpoint alternativo
                    try {
                        const url2 = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
                        const response2 = await fetchWithRetry(url2);
                        gamepassesData = response2.data;
                        console.log(`   ✅ Endpoint 2 exitoso: ${gamepassesData?.data?.length || 0} gamepasses encontrados`);
                    } catch (error2) {
                        console.warn(`   ❌ Ambos endpoints fallaron para ${gameName}`);
                    }
                }

                if (gamepassesData && gamepassesData.data && gamepassesData.data.length > 0) {
                    const gamepasses = gamepassesData.data;
                    console.log(`   📊 Procesando ${gamepasses.length} gamepasses...`);
                    
                    // Obtener detalles de cada gamepass
                    for (const pass of gamepasses) {
                        try {
                            console.log(`      🔸 Obteniendo detalles de: ${pass.name}`);
                            
                            // Intentar obtener precio del gamepass
                            let price = 0;
                            let isForSale = false;
                            
                            try {
                                const detailsUrl = `https://apis.roproxy.com/game-passes/v1/game-passes/${pass.id}/product-info`;
                                const detailsResponse = await fetchWithRetry(detailsUrl);
                                const details = detailsResponse.data;
                                price = details.price || 0;
                                isForSale = details.isForSale || false;
                                console.log(`         💰 Precio: ${price} R$ | En venta: ${isForSale}`);
                            } catch (priceError) {
                                console.warn(`         ⚠️ No se pudo obtener precio, usando valor por defecto`);
                            }
                            
                            allGamepasses.push({
                                id: pass.id,
                                name: pass.name,
                                displayName: pass.displayName || pass.name,
                                description: pass.description || '',
                                iconImageId: pass.iconImageId,
                                image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`,
                                price: price,
                                priceInRobux: price,
                                isForSale: isForSale,
                                gameId: universeId,
                                gameName: gameName
                            });

                            console.log(`         ✅ ${pass.name} agregado exitosamente`);
                        } catch (detailError) {
                            console.error(`         ❌ Error procesando gamepass ${pass.name}:`, detailError.message);
                        }
                    }
                } else {
                    console.log(`   ⚠️ No se encontraron gamepasses para ${gameName}`);
                }
            } catch (gameError) {
                console.error(`❌ Error procesando juego ${game.name}:`, gameError.message);
            }
        }

        console.log('\n====================================');
        console.log(`📊 RESULTADO FINAL:`);
        console.log(`   Juegos encontrados: ${games.length}`);
        console.log(`   Gamepasses totales: ${allGamepasses.length}`);
        console.log('====================================\n');

        res.json({
            success: true,
            gamepasses: allGamepasses,
            count: allGamepasses.length,
            gamesCount: games.length
        });

    } catch (error) {
        console.error('❌ ERROR GENERAL en /api/user/:userId/gamepasses:', error.message);
        console.error('Stack:', error.stack);
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

        // Obtener gamepasses del juego
        const gamepassesResponse = await fetchWithRetry(
            `https://games.roproxy.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`
        );

        if (!gamepassesResponse.data || !gamepassesResponse.data.data) {
            return res.json({
                success: true,
                gamepasses: [],
                count: 0
            });
        }

        const gamepasses = [];

        // Obtener detalles de cada gamepass
        for (const pass of gamepassesResponse.data.data) {
            try {
                const detailsResponse = await fetchWithRetry(
                    `https://apis.roproxy.com/game-passes/v1/game-passes/${pass.id}/product-info`
                );

                const details = detailsResponse.data;
                
                gamepasses.push({
                    id: pass.id,
                    name: pass.name,
                    displayName: pass.displayName || pass.name,
                    description: pass.description || '',
                    iconImageId: pass.iconImageId,
                    image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`,
                    price: details.price || 0,
                    priceInRobux: details.price || 0,
                    isForSale: details.isForSale || false
                });
            } catch (detailError) {
                console.warn(`⚠️ Error obteniendo detalles del gamepass ${pass.id}`);
            }
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
// ENDPOINT DE INFORMACIÓN
// ====================================
app.get('/', (req, res) => {
    res.json({
        name: 'API de Gamepasses de Roblox',
        version: '2.0.0',
        status: 'online',
        endpoints: {
            userGamepasses: {
                url: '/api/user/:userId/gamepasses',
                method: 'GET',
                description: 'Obtiene todos los gamepasses de los juegos de un usuario',
                example: '/api/user/1558070382/gamepasses'
            },
            gameGamepasses: {
                url: '/api/gamepasses/:universeId',
                method: 'GET',
                description: 'Obtiene los gamepasses de un juego específico',
                example: '/api/gamepasses/918484040462'
            }
        },
        improvements: [
            'Sistema de reintentos automáticos',
            'Endpoints alternativos',
            'Logs detallados para debugging',
            'Mejor manejo de errores'
        ]
    });
});

// ====================================
// INICIAR SERVIDOR
// ====================================
app.listen(PORT, () => {
    console.log('====================================');
    console.log('✅ API DE GAMEPASSES DE ROBLOX v2.0');
    console.log('====================================');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log(`   GET /api/user/:userId/gamepasses`);
    console.log(`   GET /api/gamepasses/:universeId`);
    console.log('');
    console.log('🔧 Mejoras v2.0:');
    console.log('   ✅ Sistema de reintentos (3 intentos)');
    console.log('   ✅ Endpoints alternativos');
    console.log('   ✅ Logs detallados');
    console.log('   ✅ Mejor manejo de errores');
    console.log('====================================');
}); Actualizar a v2.0 - Mejorar detección de gamepasses
