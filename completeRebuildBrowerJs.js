// Script to completely rebuild browser-compatible versions of the JS files
// Run with: node completelyRebuildBrowserJs.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create clean browser-compatible versions of the JS files
async function createCleanFiles() {
  console.log("Creating browser-compatible JavaScript files...");
  
  // Create utils.js
  const utilsJs = `// Utility functions for RepRally HeatMap Center

/**
 * Format currency values
 * @param {number} value - The value to format
 * @param {boolean} compact - Whether to use compact notation
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, compact = false) {
    if (value === null || value === undefined || isNaN(value)) {
        return '$0.00';
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short'
    });
    
    return formatter.format(value);
}

/**
 * Format number values with commas
 * @param {number} value - The value to format
 * @param {boolean} compact - Whether to use compact notation
 * @returns {string} Formatted number string
 */
function formatNumber(value, compact = false) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short'
    });
    
    return formatter.format(value);
}

/**
 * Calculate color for heatmap based on value
 * @param {number} value - The value to calculate color for
 * @param {number} min - Minimum value in the dataset
 * @param {number} max - Maximum value in the dataset
 * @returns {string} Hex color string
 */
function getHeatmapColor(value, min, max) {
    // Color scale from light to dark green
    const colors = [
        '#edf8fb', // lightest
        '#b2e2e2',
        '#66c2a4',
        '#2ca25f',
        '#006d2c'  // darkest
    ];
    
    // Handle edge cases
    if (min === max) return colors[2]; // Middle color
    if (value <= min) return colors[0];
    if (value >= max) return colors[colors.length - 1];
    
    // Normalize value between 0 and 1
    const normalizedValue = (value - min) / (max - min);
    
    // Calculate color index
    const index = Math.min(
        Math.floor(normalizedValue * colors.length),
        colors.length - 1
    );
    
    return colors[index];
}

/**
 * Get color for network connections based on GMV
 * @param {number} gmv - GMV value
 * @returns {string} Hex color string
 */
function getNetworkColor(gmv) {
    // Use a gradient from blue to orange based on GMV
    if (gmv < 1000) return '#3498db'; // low - blue
    if (gmv < 5000) return '#2980b9'; // medium-low
    if (gmv < 10000) return '#e67e22'; // medium-high
    return '#d35400'; // high - orange
}

/**
 * Calculate marker size based on GMV
 * @param {number} gmv - GMV value
 * @param {number} min - Minimum GMV in dataset
 * @param {number} max - Maximum GMV in dataset
 * @returns {number} Marker radius in pixels
 */
function calculateMarkerSize(gmv, min, max) {
    const minRadius = 5;
    const maxRadius = 20;
    
    // Handle edge cases
    if (min === max) return (minRadius + maxRadius) / 2;
    if (gmv <= min) return minRadius;
    if (gmv >= max) return maxRadius;
    
    // Normalize value and calculate radius
    const normalizedValue = (gmv - min) / (max - min);
    return minRadius + normalizedValue * (maxRadius - minRadius);
}

/**
 * Show loading overlay
 * @param {string} message - Optional loading message
 */
function showLoading(message = 'Loading data...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const messageElement = loadingOverlay.querySelector('p');
    
    messageElement.textContent = message;
    loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'none';
}

/**
 * Handle API errors
 * @param {Error} error - The error object
 */
function handleApiError(error) {
    console.error('API Error:', error);
    hideLoading();
    
    // Show user-friendly error message
    alert('An error occurred while fetching data. Please try again later.');
}

/**
 * Truncate text if it exceeds maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 30) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}`;

  // Create MapManager.js
  const mapManagerJs = `// Map Manager for RepRally HeatMap Center

class MapManager {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.currentLevel = 'nation'; // 'nation', 'state', 'city'
        this.currentState = null;
        this.currentCity = null;
        this.dataLayer = null;
        this.networkLayer = null;
        this.isNetworkView = false;
        this.geoData = null;
        this.stateGeoData = null;
        
        // Map options
        this.mapOptions = {
            nation: {
                center: [37.8, -96.9],
                zoom: 4,
                minZoom: 3,
                maxZoom: 12
            },
            state: {
                zoom: 6,
                minZoom: 5,
                maxZoom: 12
            },
            city: {
                zoom: 10,
                minZoom: 8,
                maxZoom: 16
            }
        };
        
        // Style options
        this.styleOptions = {
            nationDefault: {
                weight: 1,
                opacity: 1,
                color: '#aaa',
                fillOpacity: 0.7
            },
            stateDefault: {
                weight: 1,
                opacity: 1,
                color: '#aaa',
                fillOpacity: 0.7
            },
            highlight: {
                weight: 2,
                color: '#1a73e8',
                dashArray: '',
                fillOpacity: 0.8
            }
        };
    }
    
    /**
     * Initialize the map
     */
    async initialize() {
        try {
            // Create Leaflet map
            this.map = L.map(this.mapElementId, {
                center: this.mapOptions.nation.center,
                zoom: this.mapOptions.nation.zoom,
                minZoom: this.mapOptions.nation.minZoom,
                maxZoom: this.mapOptions.nation.maxZoom,
                zoomControl: true
            });
            
            // Add tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(this.map);
            
            // Load GeoJSON data for US states boundaries
            await this.loadGeoData();
            
            // Initial rendering of the map
            this.renderNationMap();
        } catch (error) {
            console.error('Map initialization error:', error);
            throw error;
        }
    }
    
    /**
     * Load GeoJSON data for map boundaries
     */
    async loadGeoData() {
        try {
            // Load US states boundaries
            const response = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
            this.geoData = await response.json();
        } catch (error) {
            console.error('Error loading GeoJSON data:', error);
            throw error;
        }
    }
    
    /**
     * Render the nation-level heatmap
     * @param {Array} statesData - GMV data by state
     */
    renderNationMap(statesData = []) {
        this.currentLevel = 'nation';
        this.currentState = null;
        this.currentCity = null;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // Adjust map view
        this.map.setView(this.mapOptions.nation.center, this.mapOptions.nation.zoom);
        
        // If no data provided, just render the base map
        if (!statesData || statesData.length === 0) {
            this.dataLayer = L.geoJSON(this.geoData, {
                style: this.styleOptions.nationDefault,
                onEachFeature: (feature, layer) => {
                    layer.on({
                        mouseover: this.highlightFeature.bind(this),
                        mouseout: this.resetHighlight.bind(this),
                        click: (e) => {
                            const stateName = feature.properties.name;
                            // Dispatch custom event for state click
                            const event = new CustomEvent('stateClick', { detail: { state: stateName } });
                            document.dispatchEvent(event);
                        }
                    });
                }
            }).addTo(this.map);
            return;
        }
        
        // Find min and max GMV values
        const gmvValues = statesData.map(d => d.total_gmv);
        const minGMV = Math.min(...gmvValues);
        const maxGMV = Math.max(...gmvValues);
        
        // Create a map of state name to data for quicker lookup
        const stateDataMap = statesData.reduce((map, data) => {
            if (data && data.state) {
                map[data.state.toUpperCase()] = data;
            }
            return map;
        }, {});
        
        // Create GeoJSON layer with heatmap colors
        this.dataLayer = L.geoJSON(this.geoData, {
            style: (feature) => {
                const stateName = feature.properties.name.toUpperCase();
                const stateData = stateDataMap[stateName];
                
                let fillColor = '#f5f5f5'; // Default color for states with no data
                if (stateData) {
                    fillColor = getHeatmapColor(stateData.total_gmv, minGMV, maxGMV);
                }
                
                return {
                    ...this.styleOptions.nationDefault,
                    fillColor
                };
            },
            onEachFeature: (feature, layer) => {
                const stateName = feature.properties.name.toUpperCase();
                const stateData = stateDataMap[stateName] || {
                    state: feature.properties.name,
                    store_count: 0,
                    total_gmv: 0
                };
                
                layer.on({
                    mouseover: (e) => {
                        this.highlightFeature(e);
                        
                        // Dispatch hover event with state data
                        const event = new CustomEvent('regionHover', {
                            detail: {
                                region: feature.properties.name,
                                data: stateData
                            }
                        });
                        document.dispatchEvent(event);
                    },
                    mouseout: this.resetHighlight.bind(this),
                    click: (e) => {
                        const stateName = feature.properties.name;
                        // Dispatch custom event for state click
                        const event = new CustomEvent('stateClick', { detail: { state: stateName } });
                        document.dispatchEvent(event);
                    }
                });
            }
        }).addTo(this.map);
    }
    
    /**
     * Render the state-level map with cities
     * @param {string} stateName - The state name
     * @param {Array} citiesData - GMV data by city
     */
    renderStateMap(stateName, citiesData = []) {
        this.currentLevel = 'state';
        this.currentState = stateName;
        this.currentCity = null;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // Find the state in the GeoJSON data
        const stateFeature = this.geoData.features.find(f => 
            f.properties.name.toLowerCase() === stateName.toLowerCase()
        );
        
        if (!stateFeature) {
            console.error(\`State not found: \${stateName}\`);
            return;
        }
        
        // Set map view to center on the state
        const bounds = L.geoJSON(stateFeature).getBounds();
        this.map.fitBounds(bounds);
        
        // Render the state boundary
        this.dataLayer = L.geoJSON(stateFeature, {
            style: {
                weight: 2,
                color: '#1a73e8',
                fillColor: '#e4eff9',
                fillOpacity: 0.2,
                opacity: 1
            }
        }).addTo(this.map);
        
        // If no data provided, just render the base map
        if (!citiesData || citiesData.length === 0) {
            return;
        }
        
        // Find min and max GMV values
        const gmvValues = citiesData.map(d => d.total_gmv);
        const minGMV = Math.min(...gmvValues);
        const maxGMV = Math.max(...gmvValues);
        
        // Add city markers with heatmap colors
        const cityMarkers = L.layerGroup();
        
        citiesData.forEach(cityData => {
            if (cityData.latitude && cityData.longitude) {
                const radius = calculateMarkerSize(cityData.total_gmv, minGMV, maxGMV);
                const color = getHeatmapColor(cityData.total_gmv, minGMV, maxGMV);
                
                const marker = L.circleMarker([cityData.latitude, cityData.longitude], {
                    radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                marker.cityData = cityData;
                
                marker.on('mouseover', (e) => {
                    // Highlight the marker
                    e.target.setStyle({
                        fillOpacity: 1,
                        weight: 2
                    });
                    
                    // Dispatch hover event with city data
                    const event = new CustomEvent('regionHover', {
                        detail: {
                            region: cityData.city,
                            data: cityData
                        }
                    });
                    document.dispatchEvent(event);
                });
                
                marker.on('mouseout', (e) => {
                    // Reset marker style
                    e.target.setStyle({
                        fillOpacity: 0.8,
                        weight: 1
                    });
                });
                
                marker.on('click', (e) => {
                    // Dispatch click event
                    const event = new CustomEvent('cityClick', {
                        detail: {
                            city: cityData.city,
                            state: this.currentState
                        }
                    });
                    document.dispatchEvent(event);
                });
                
                // Add tooltip
                marker.bindTooltip(cityData.city, {
                    permanent: false,
                    direction: 'top',
                    className: 'city-tooltip'
                });
                
                cityMarkers.addLayer(marker);
            }
        });
        
        cityMarkers.addTo(this.map);
        this.dataLayer = cityMarkers;
    }
    
    /**
     * Render the city-level map with store locations
     * @param {string} cityName - The city name
     * @param {string} stateName - The state name
     * @param {Array} storesData - Store data
     */
    renderCityMap(cityName, stateName, storesData = []) {
        this.currentLevel = 'city';
        this.currentState = stateName;
        this.currentCity = cityName;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // If no data provided, return
        if (!storesData || storesData.length === 0) {
            return;
        }
        
        // Calculate average lat/lng to center the map
        const validCoords = storesData.filter(s => s.LATITUDE && s.LONGITUDE);
        if (validCoords.length === 0) {
            console.error('No valid coordinates for stores in this city');
            return;
        }
        
        const avgLat = validCoords.reduce((sum, s) => sum + s.LATITUDE, 0) / validCoords.length;
        const avgLng = validCoords.reduce((sum, s) => sum + s.LONGITUDE, 0) / validCoords.length;
        
        // Set map view
        this.map.setView([avgLat, avgLng], this.mapOptions.city.zoom);
        
        // Find min and max GMV values
        const gmvValues = storesData.map(s => s.GMV_LAST_MONTH);
        const minGMV = Math.min(...gmvValues.filter(v => v > 0));
        const maxGMV = Math.max(...gmvValues);
        
        // Create store markers
        const storeMarkers = L.layerGroup();
        
        storesData.forEach(store => {
            if (store.LATITUDE && store.LONGITUDE) {
                const radius = calculateMarkerSize(store.GMV_LAST_MONTH, minGMV, maxGMV);
                const color = getHeatmapColor(store.GMV_LAST_MONTH, minGMV, maxGMV);
                
                const marker = L.circleMarker([store.LATITUDE, store.LONGITUDE], {
                    radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                // Popup content
                const popupContent = \`
                    <div class="store-popup">
                        <div class="store-popup-header">\${store.STORE_LOCATION_NAME || 'Store #' + store.STORE_ID}</div>
                        <div class="store-popup-address">\${store.STORE_ADDRESS}, \${store.STORE_CITY}, \${store.STORE_STATE}</div>
                        <div class="store-popup-stat">
                            <span class="store-popup-label">GMV (Last Month):</span>
                            <span class="store-popup-value">\${formatCurrency(store.GMV_LAST_MONTH)}</span>
                        </div>
                        <div class="store-popup-stat">
                            <span class="store-popup-label">Lifetime GMV:</span>
                            <span class="store-popup-value">\${formatCurrency(store.STORE_LIFETIME_GMV)}</span>
                        </div>
                        <div class="store-popup-stat">
                            <span class="store-popup-label">Lifetime Orders:</span>
                            <span class="store-popup-value">\${formatNumber(store.STORE_LIFETIME_ORDERS)}</span>
                        </div>
                    </div>
                \`;
                
                marker.bindPopup(popupContent);
                
                marker.on('mouseover', (e) => {
                    // Highlight the marker
                    e.target.setStyle({
                        fillOpacity: 1,
                        weight: 3
                    });
                    
                    // Display store data in info panel
                    const event = new CustomEvent('storeHover', {
                        detail: { store }
                    });
                    document.dispatchEvent(event);
                });
                
                marker.on('mouseout', (e) => {
                    // Reset marker style
                    e.target.setStyle({
                        fillOpacity: 0.8,
                        weight: 2
                    });
                });
                
                storeMarkers.addLayer(marker);
            }
        });
        
        storeMarkers.addTo(this.map);
        this.dataLayer = storeMarkers;
    }
    
    /**
     * Render network view showing connections between stores and sellers
     * @param {string} cityName - The city name
     * @param {string} stateName - The state name
     * @param {Array} networkData - Network connection data
     */
    renderNetworkView(cityName, stateName, networkData = []) {
        this.currentLevel = 'city';
        this.currentState = stateName;
        this.currentCity = cityName;
        this.isNetworkView = true;
        
        // Clear previous layers
        this.clearLayers();
        
        // If no data provided, return
        if (!networkData || networkData.length === 0) {
            return;
        }
        
        // Calculate average lat/lng to center the map
        const validCoords = networkData.filter(n => 
            n.store_lat && n.store_lng && n.seller_lat && n.seller_lng
        );
        
        if (validCoords.length === 0) {
            console.error('No valid coordinates for network data');
            return;
        }
        
        // All valid coordinates for both stores and sellers
        const allLats = [
            ...validCoords.map(n => n.store_lat),
            ...validCoords.map(n => n.seller_lat)
        ];
        
        const allLngs = [
            ...validCoords.map(n => n.store_lng),
            ...validCoords.map(n => n.seller_lng)
        ];
        
        // Calculate bounds
        const minLat = Math.min(...allLats);
        const maxLat = Math.max(...allLats);
        const minLng = Math.min(...allLngs);
        const maxLng = Math.max(...allLngs);
        
        // Create bounds and fit map
        const bounds = L.latLngBounds(
            L.latLng(minLat, minLng),
            L.latLng(maxLat, maxLng)
        );
        this.map.fitBounds(bounds.pad(0.2)); // Add padding
        
        // Create network visualization
        const networkLayer = L.layerGroup();
        
        // Store and seller markers
        const storeMarkers = {};
        const sellerMarkers = {};
        
        // Process network data
        networkData.forEach(item => {
            if (!item.store_lat || !item.store_lng || !item.seller_lat || !item.seller_lng) {
                return; // Skip invalid coordinates
            }
            
            // Get or create store marker
            if (!storeMarkers[item.STORE_ID]) {
                const storeMarker = L.circleMarker([item.store_lat, item.store_lng], {
                    radius: 8,
                    fillColor: '#1a73e8',
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                storeMarker.bindTooltip(\`Store: \${item.STORE_LOCATION_NAME || 'Store #' + item.STORE_ID}\`, {
                    permanent: false,
                    direction: 'top'
                });
                
                networkLayer.addLayer(storeMarker);
                storeMarkers[item.STORE_ID] = storeMarker;
            }
            
            // Get or create seller marker
            if (!sellerMarkers[item.SELLER_ID]) {
                const sellerMarker = L.circleMarker([item.seller_lat, item.seller_lng], {
                    radius: 6,
                    fillColor: '#34a853',
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                sellerMarker.bindTooltip(\`Seller: \${item.SELLER_FULL_NAME || 'Seller #' + item.SELLER_ID}\`, {
                    permanent: false,
                    direction: 'top'
                });
                
                networkLayer.addLayer(sellerMarker);
                sellerMarkers[item.SELLER_ID] = sellerMarker;
            }
            
            // Draw connection line
            const line = L.polyline(
                [
                    [item.store_lat, item.store_lng],
                    [item.seller_lat, item.seller_lng]
                ],
                {
                    color: '#fbbc04',
                    weight: 2,
                    opacity: 0.7,
                    dashArray: '5, 5'
                }
            );
            
            networkLayer.addLayer(line);
        });
        
        networkLayer.addTo(this.map);
        this.networkLayer = networkLayer;
    }
    
    /**
     * Toggle network view
     * @param {boolean} showNetwork - Whether to show network view
     * @param {Array} networkData - Network data for current city
     */
    toggleNetworkView(showNetwork, networkData = []) {
        if (this.currentLevel !== 'city') {
            console.error('Network view is only available at city level');
            return;
        }
        
        this.isNetworkView = showNetwork;
        
        if (showNetwork) {
            this.renderNetworkView(this.currentCity, this.currentState, networkData);
        } else {
            // TODO: Implement toggling back to regular city view
            // This would require storing the stores data to re-render
            console.log('Toggling back to regular city view');
        }
    }
    
    /**
     * Highlight a GeoJSON feature on hover
     * @param {Event} e - Leaflet event
     */
    highlightFeature(e) {
        const layer = e.target;
        
        layer.setStyle(this.styleOptions.highlight);
        
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
    
    /**
     * Reset highlight on mouseout
     * @param {Event} e - Leaflet event
     */
    resetHighlight(e) {
        if (this.currentLevel === 'nation') {
            this.dataLayer.resetStyle(e.target);
        } else if (this.currentLevel === 'state') {
            // For state level, we need custom reset logic
            const layer = e.target;
            layer.setStyle(this.styleOptions.stateDefault);
        }
    }
    
    /**
     * Clear all map layers
     */
    clearLayers() {
        if (this.dataLayer) {
            this.map.removeLayer(this.dataLayer);
            this.dataLayer = null;
        }
        
        if (this.networkLayer) {
            this.map.removeLayer(this.networkLayer);
            this.networkLayer = null;
        }
    }
    
    /**
     * Go back to previous map level
     */
    goBack() {
        if (this.currentLevel === 'city') {
            // Go back to state level
            const event = new CustomEvent('goToState', {
                detail: { state: this.currentState }
            });
            document.dispatchEvent(event);
        } else if (this.currentLevel === 'state') {
            // Go back to nation level
            const event = new CustomEvent('goToNation');
            document.dispatchEvent(event);
        }
    }
    
    /**
     * Get current map state
     */
    getCurrentState() {
        return {
            level: this.currentLevel,
            state: this.currentState,
            city: this.currentCity,
            isNetworkView: this.isNetworkView
        };
    }
}`;

  const homeJs = `// Main JavaScript for Home Page

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const goBackBtn = document.getElementById('go-back-btn');
    const toggleNetworkBtn = document.getElementById('toggle-network-btn');
    const levelNation = document.getElementById('level-nation');
    const levelState = document.getElementById('level-state');
    const levelCity = document.getElementById('level-city');
    const levelSeparator1 = document.getElementById('level-separator-1');
    const levelSeparator2 = document.getElementById('level-separator-2');
    const panelTitle = document.getElementById('panel-title');
    const totalStores = document.getElementById('total-stores');
    const totalGMV = document.getElementById('total-gmv');
    const avgGMV = document.getElementById('avg-gmv');
    const hoverInfo = document.getElementById('hover-info');
    const hoverTitle = document.getElementById('hover-title');
    const hoverDetails = document.getElementById('hover-details');
    const selectedDetails = document.getElementById('selected-details');
    const selectedTitle = document.getElementById('selected-title');
    const selectedContent = document.getElementById('selected-content');
    
    // Initialize MapManager
    const mapManager = new MapManager('map');
    
    // App state
    let appState = {
        currentStatesData: [],
        currentCitiesData: [],
        currentStoresData: [],
        currentNetworkData: [],
        isNetworkViewActive: false
    };
    
    // Initialize app
    async function initApp() {
        showLoading('Initializing map...');
        
        try {
            // Initialize map
            await mapManager.initialize();
            
            // Load initial data and render
            await loadNationData();
            
            // Initialize event listeners
            initEventListeners();
            
            // Load user info
            loadUserInfo();
            
            hideLoading();
        } catch (error) {
            console.error('Error initializing app:', error);
            hideLoading();
            alert('An error occurred while initializing the application. Please try again later.');
        }
    }
    
    // Initialize event listeners
    function initEventListeners() {
        // Go back button
        goBackBtn.addEventListener('click', handleGoBack);
        
        // Toggle network view button
        toggleNetworkBtn.addEventListener('click', handleToggleNetwork);
        
        // Custom map events
        document.addEventListener('stateClick', handleStateClick);
        document.addEventListener('cityClick', handleCityClick);
        document.addEventListener('regionHover', handleRegionHover);
        document.addEventListener('storeHover', handleStoreHover);
        document.addEventListener('goToState', (e) => navigateToState(e.detail.state));
        document.addEventListener('goToNation', navigateToNation);
    }
    
    // Load user info
    async function loadUserInfo() {
        try {
            const response = await fetch('/api/user/info');
            
            if (response.ok) {
                const userData = await response.json();
                const usernameDisplay = document.getElementById('username-display');
                
                if (userData && userData.username) {
                    usernameDisplay.innerHTML = \`<i class="fas fa-user"></i> \${userData.username}\`;
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }
    
    // Load nation-level data
    async function loadNationData() {
        showLoading('Loading national data...');
        
        try {
            const response = await fetch('/api/states-gmv');
            
            if (!response.ok) {
                throw new Error(\`Error fetching states data: \${response.status}\`);
            }
            
            let statesData = await response.json();
            
            // Validate states data
            if (!Array.isArray(statesData)) {
                console.error('Invalid states data format, should be an array:', statesData);
                statesData = [];
            }
            
            // Filter out any invalid entries
            statesData = statesData.filter(state => 
                state && typeof state === 'object' && state.state && 
                typeof state.state === 'string' && 
                !isNaN(state.store_count) && !isNaN(state.total_gmv)
            );
            
            appState.currentStatesData = statesData;
            
            // Update UI
            updateNationView(statesData);
            
            // Render map
            mapManager.renderNationMap(statesData);
            
            hideLoading();
        } catch (error) {
            console.error('Error loading nation data:', error);
            hideLoading();
            handleApiError(error);
        }
    }
    
    // Load state-level data
    async function loadStateData(stateName) {
        showLoading(\`Loading data for \${stateName}...\`);
        
        try {
            const response = await fetch(\`/api/cities-gmv/\${encodeURIComponent(stateName)}\`);
            
            if (!response.ok) {
                throw new Error(\`Error fetching cities data: \${response.status}\`);
            }
            
            const citiesData = await response.json();
            appState.currentCitiesData = citiesData;
            
            // Update UI
            updateStateView(stateName, citiesData);
            
            // Render map
            mapManager.renderStateMap(stateName, citiesData);
            
            hideLoading();
        } catch (error) {
            console.error(\`Error loading state data for \${stateName}:\`, error);
            hideLoading();
            handleApiError(error);
        }
    }
    
    // Load city-level data
    async function loadCityData(cityName, stateName) {
        showLoading(\`Loading stores in \${cityName}, \${stateName}...\`);
        
        try {
            const response = await fetch(\`/api/stores/\${encodeURIComponent(cityName)}/\${encodeURIComponent(stateName)}\`);
            
            if (!response.ok) {
                throw new Error(\`Error fetching stores data: \${response.status}\`);
            }
            
            const storesData = await response.json();
            appState.currentStoresData = storesData;
            
            // Update UI
            updateCityView(cityName, stateName, storesData);
            
            // Render map
            mapManager.renderCityMap(cityName, stateName, storesData);
            
            // Also fetch network data for potential use
            loadNetworkData(cityName, stateName);
            
            hideLoading();
        } catch (error) {
            console.error(\`Error loading city data for \${cityName}, \${stateName}:\`, error);
            hideLoading();
            handleApiError(error);
        }
    }
    
    // Load network data
    async function loadNetworkData(cityName, stateName) {
        try {
            const response = await fetch(\`/api/network/\${encodeURIComponent(cityName)}/\${encodeURIComponent(stateName)}\`);
            
            if (!response.ok) {
                throw new Error(\`Error fetching network data: \${response.status}\`);
            }
            
            const networkData = await response.json();
            appState.currentNetworkData = networkData;
            
            // Enable network toggle if data is available
            toggleNetworkBtn.disabled = networkData.length === 0;
            toggleNetworkBtn.classList.remove('hidden');
            
        } catch (error) {
            console.error(\`Error loading network data for \${cityName}, \${stateName}:\`, error);
            // Don't show error to user, just disable network view
            toggleNetworkBtn.disabled = true;
        }
    }
    
    // Update nation view
    function updateNationView(statesData) {
        // Update navigation path
        levelNation.classList.add('active');
        levelState.classList.remove('active');
        levelState.classList.add('hidden');
        levelCity.classList.add('hidden');
        levelSeparator1.classList.add('hidden');
        levelSeparator2.classList.add('hidden');
        
        // Update panel title
        panelTitle.textContent = 'National Overview';
        
        // Calculate totals
        const totalStoreCount = statesData.reduce((sum, state) => sum + state.store_count, 0);
        const totalGMVValue = statesData.reduce((sum, state) => sum + state.total_gmv, 0);
        const avgGMVValue = totalStoreCount > 0 ? totalGMVValue / totalStoreCount : 0;
        
        // Update stats
        totalStores.textContent = formatNumber(totalStoreCount);
        totalGMV.textContent = formatCurrency(totalGMVValue, true);
        avgGMV.textContent = formatCurrency(avgGMVValue);
        
        // Reset hover and selected info
        hoverInfo.classList.add('hidden');
        selectedDetails.classList.add('hidden');
        
        // Update go back button
        goBackBtn.disabled = true;
        
        // Hide network toggle
        toggleNetworkBtn.classList.add('hidden');
        appState.isNetworkViewActive = false;
    }
    
    // Update state view
    function updateStateView(stateName, citiesData) {
        // Update navigation path
        levelNation.classList.remove('active');
        levelState.textContent = stateName;
        levelState.classList.remove('hidden');
        levelState.classList.add('active');
        levelCity.classList.add('hidden');
        levelSeparator1.classList.remove('hidden');
        levelSeparator2.classList.add('hidden');
        
        // Update panel title
        panelTitle.textContent = \`\${stateName} Overview\`;
        
        // Calculate totals
        const totalStoreCount = citiesData.reduce((sum, city) => sum + city.store_count, 0);
        const totalGMVValue = citiesData.reduce((sum, city) => sum + city.total_gmv, 0);
        const avgGMVValue = totalStoreCount > 0 ? totalGMVValue / totalStoreCount : 0;
        
        // Update stats
        totalStores.textContent = formatNumber(totalStoreCount);
        totalGMV.textContent = formatCurrency(totalGMVValue, true);
        avgGMV.textContent = formatCurrency(avgGMVValue);
        
        // Reset hover and selected info
        hoverInfo.classList.add('hidden');
        selectedDetails.classList.add('hidden');
        
        // Update go back button
        goBackBtn.disabled = false;
        
        // Hide network toggle
        toggleNetworkBtn.classList.add('hidden');
        appState.isNetworkViewActive = false;
    }
    
    // Update city view
    function updateCityView(cityName, stateName, storesData) {
        // Update navigation path
        levelNation.classList.remove('active');
        levelState.classList.remove('active');
        levelState.classList.remove('hidden');
        levelCity.textContent = cityName;
        levelCity.classList.remove('hidden');
        levelCity.classList.add('active');
        levelSeparator1.classList.remove('hidden');
        levelSeparator2.classList.remove('hidden');
        
        // Update panel title
        panelTitle.textContent = \`\${cityName}, \${stateName} Stores\`;
        
        // Calculate totals
        const totalStoreCount = storesData.length;
        const totalGMVValue = storesData.reduce((sum, store) => sum + store.GMV_LAST_MONTH, 0);
        const avgGMVValue = totalStoreCount > 0 ? totalGMVValue / totalStoreCount : 0;
        
        // Update stats
        totalStores.textContent = formatNumber(totalStoreCount);
        totalGMV.textContent = formatCurrency(totalGMVValue, true);
        avgGMV.textContent = formatCurrency(avgGMVValue);
        
        // Reset hover and selected info
        hoverInfo.classList.add('hidden');
        selectedDetails.classList.add('hidden');
        
        // Update go back button
        goBackBtn.disabled = false;
    }
    
    // Handle state click
    function handleStateClick(e) {
        const stateName = e.detail.state;
        navigateToState(stateName);
    }
    
    // Handle city click
    function handleCityClick(e) {
        const { city, state } = e.detail;
        navigateToCity(city, state);
    }
    
    // Handle region hover (state or city)
    function handleRegionHover(e) {
        const { region, data } = e.detail;
        
        // Show hover info
        hoverInfo.classList.remove('hidden');
        hoverTitle.textContent = region;
        
        // Generate hover details HTML
        let detailsHTML = '';
        
        if (mapManager.getCurrentState().level === 'nation') {
            // State hover details
            detailsHTML = \`
                <div class="hover-detail-item">
                    <span class="hover-label">Total Stores:</span>
                    <span class="hover-value">\${formatNumber(data.store_count)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Total GMV (Last Month):</span>
                    <span class="hover-value">\${formatCurrency(data.total_gmv)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Avg GMV Per Store:</span>
                    <span class="hover-value">\${formatCurrency(data.store_count > 0 ? data.total_gmv / data.store_count : 0)}</span>
                </div>
            \`;
        } else if (mapManager.getCurrentState().level === 'state') {
            // City hover details
            detailsHTML = \`
                <div class="hover-detail-item">
                    <span class="hover-label">City:</span>
                    <span class="hover-value">\${data.city}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Total Stores:</span>
                    <span class="hover-value">\${formatNumber(data.store_count)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Total GMV (Last Month):</span>
                    <span class="hover-value">\${formatCurrency(data.total_gmv)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Click to see store details</span>
                </div>
            \`;
        }
        
        hoverDetails.innerHTML = detailsHTML;
    }
    
    // Handle store hover
    function handleStoreHover(e) {
        const { store } = e.detail;
        
        // Show hover info
        hoverInfo.classList.remove('hidden');
        hoverTitle.textContent = store.STORE_LOCATION_NAME || \`Store #\${store.STORE_ID}\`;
        
        // Generate hover details HTML
        const detailsHTML = \`
            <div class="hover-detail-item">
                <span class="hover-label">Address:</span>
                <span class="hover-value">\${store.STORE_ADDRESS}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">GMV (Last Month):</span>
                <span class="hover-value">\${formatCurrency(store.GMV_LAST_MONTH)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Lifetime GMV:</span>
                <span class="hover-value">\${formatCurrency(store.STORE_LIFETIME_GMV)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Lifetime Orders:</span>
                <span class="hover-value">\${formatNumber(store.STORE_LIFETIME_ORDERS)}</span>
            </div>
        \`;
        
        hoverDetails.innerHTML = detailsHTML;
    }
    
    // Handle go back button click
    function handleGoBack() {
        const currentState = mapManager.getCurrentState();
        
        if (currentState.level === 'city') {
            navigateToState(currentState.state);
        } else if (currentState.level === 'state') {
            navigateToNation();
        }
    }
    
    // Handle toggle network view
    function handleToggleNetwork() {
        const currentState = mapManager.getCurrentState();
        
        if (currentState.level !== 'city') {
            return; // Only available at city level
        }
        
        appState.isNetworkViewActive = !appState.isNetworkViewActive;
        
        if (appState.isNetworkViewActive) {
            // Switch to network view
            toggleNetworkBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Store View';
            mapManager.renderNetworkView(currentState.city, currentState.state, appState.currentNetworkData);
        } else {
            // Switch back to store view
            toggleNetworkBtn.innerHTML = '<i class="fas fa-network-wired"></i> Network View';
            mapManager.renderCityMap(currentState.city, currentState.state, appState.currentStoresData);
        }
    }
    
    // Navigation functions
    function navigateToNation() {
        loadNationData();
    }
    
    function navigateToState(stateName) {
        loadStateData(stateName);
    }
    
    function navigateToCity(cityName, stateName) {
        loadCityData(cityName, stateName);
    }
    
    // Initialize app
    initApp();
});`;

  // Create the directories if they don't exist
  try {
    await fs.mkdir(path.join(__dirname, 'public', 'js'), { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }

  // Write the files
  try {
    await fs.writeFile(path.join(__dirname, 'public', 'js', 'utils.js'), utilsJs);
    console.log('Created clean utils.js');
    
    await fs.writeFile(path.join(__dirname, 'public', 'js', 'mapManager.js'), mapManagerJs);
    console.log('Created clean mapManager.js');
    
    await fs.writeFile(path.join(__dirname, 'public', 'js', 'home.js'), homeJs);
    console.log('Created clean home.js');
    
    console.log('All files created successfully!');
  } catch (error) {
    console.error('Error writing files:', error);
  }
}

// Run the function
createCleanFiles()
  .then(() => console.log('Clean browser-compatible JS files have been created.'))
  .catch(error => console.error('Error:', error));