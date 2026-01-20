// ====================================
// API DE GAMEPASSES DE ROBLOX
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
// ENDPOINT PRINCIPAL: Gamepasses de los juegos de un usuario
// ====================================
app.get('/api/user/:userId/gamepasses', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`🔍 Buscando gamepasses para userId: ${userId}`);

        // PASO 1: Obtener todos los juegos del usuario
        const gamesResponse = await axios.get(
            `https://games.roproxy.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc`
        );

        if (!gamesResponse.data || !gamesResponse.data.data) {
            console.log('⚠️ Usuario no tiene juegos públicos');
            return res.json({
                success: true,
                gamepasses: [],
                count: 0,
                message: 'Este usuario no tiene juegos públicos'
            });
        }

        const games = gamesResponse.data.data;
        console.log(`✅ Se encontraron ${games.length} juegos del usuario`);

        // PASO 2: Obtener gamepasses de cada juego
        const allGamepasses = [];

        for (const game of games) {
            try {
                const universeId = game.id;
                const gameName = game.name;
                
                console.log(`📦 Buscando gamepasses del juego: ${gameName} (${universeId})`);

                // Obtener gamepasses del juego
                const gamepassesResponse = await axios.get(
                    `https://games.roproxy.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`
                );

                if (gamepassesResponse.data && gamepassesResponse.data.data) {
                    const gamepasses = gamepassesResponse.data.data;
                    
                    // Obtener detalles de cada gamepass (incluyendo precio)
                    for (const pass of gamepasses) {
                        try {
                            const detailsResponse = await axios.get(
                                `https://apis.roproxy.com/game-passes/v1/game-passes/${pass.id}/product-info`
                            );

                            const details = detailsResponse.data;
                            
                            allGamepasses.push({
                                id: pass.id,
                                name: pass.name,
                                displayName: pass.displayName || pass.name,
                                description: pass.description || '',
                                iconImageId: pass.iconImageId,
                                image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`,
                                price: details.price || 0,
                                priceInRobux: details.price || 0,
                                isForSale: details.isForSale || false,
                                gameId: universeId,
                                gameName: gameName
                            });

                            console.log(`   ✅ ${pass.name}: ${details.price || 0} R$`);
                        } catch (detailError) {
                            console.warn(`   ⚠️ No se pudieron obtener detalles de ${pass.name}`);
                            // Agregar sin precio si falla
                            allGamepasses.push({
                                id: pass.id,
                                name: pass.name,
                                displayName: pass.displayName || pass.name,
                                description: pass.description || '',
                                iconImageId: pass.iconImageId,
                                image: `https://tr.rbxcdn.com/game-pass-thumbnail/image?width=150&height=150&gamePassId=${pass.id}`,
                                price: 0,
                                priceInRobux: 0,
                                isForSale: false,
                                gameId: universeId,
                                gameName: gameName
                            });
                        }
                    }
                }
            } catch (gameError) {
                console.warn(`⚠️ Error obteniendo gamepasses del juego ${game.name}:`, gameError.message);
            }
        }

        console.log(`📊 Total de gamepasses encontrados: ${allGamepasses.length}`);

        res.json({
            success: true,
            gamepasses: allGamepasses,
            count: allGamepasses.length,
            gamesCount: games.length
        });

    } catch (error) {
        console.error('❌ Error en /api/user/:userId/gamepasses:', error.message);
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
        const gamepassesResponse = await axios.get(
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
                const detailsResponse = await axios.get(
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
        version: '1.0.0',
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
        }
    });
});

// ====================================
// INICIAR SERVIDOR
// ====================================
app.listen(PORT, () => {
    console.log('====================================');
    console.log('✅ API DE GAMEPASSES DE ROBLOX');
    console.log('====================================');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log(`   GET /api/user/:userId/gamepasses`);
    console.log(`   GET /api/gamepasses/:universeId`);
    console.log('====================================');
});