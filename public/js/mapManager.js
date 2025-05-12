    /**
     * Add custom CSS for map elements
     */
    // Enhanced Map Manager for RepRally HeatMap Center

class MapManager {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.currentLevel = 'nation'; // 'nation', 'state', 'city'
        this.currentState = null;
        this.currentCity = null;
        this.dataLayer = null;
        this.storesLayer = null;
        this.sellersLayer = null;
        this.connectionsLayer = null;
        this.isNetworkView = false;
        this.geoData = null;
        
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
            },
            store: {
                radius: 8,
                fillColor: '#1a73e8',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            },
            seller: {
                radius: 6,
                fillColor: '#34a853',
                color: '#fff', 
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            },
            connection: {
                color: '#fbbc04',
                weight: 2,
                opacity: 0.7,
                dashArray: '5, 5'
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
            
            // Add custom CSS for markers
            this.addCustomCSS();
            
            // Initial rendering of the map
            this.renderNationMap();
            
            return true;
        } catch (error) {
            console.error('Map initialization error:', error);
            throw error;
        }
    }
    
    /**
     * Add custom CSS for map elements
     */
    addCustomCSS() {
        if (document.getElementById('map-custom-styles')) {
            return; // Styles already added
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = 'map-custom-styles';
        styleEl.textContent = `
            .seller-cross {
                position: relative;
                width: 16px;
                height: 16px;
                transform: rotate(45deg);
            }
            
            .seller-cross:before,
            .seller-cross:after {
                content: '';
                position: absolute;
                background-color: #34a853;
            }
            
            .seller-cross:before {
                width: 100%;
                height: 4px;
                top: 6px;
                left: 0;
            }
            
            .seller-cross:after {
                width: 4px;
                height: 100%;
                top: 0;
                left: 6px;
            }
            
            .seller-marker.highlighted .seller-cross {
                transform: rotate(45deg) scale(1.3);
                box-shadow: 0 0 8px rgba(52, 168, 83, 0.8);
            }
            
            .highlight-connection {
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 0.9; }
                50% { opacity: 0.5; }
                100% { opacity: 0.9; }
            }
            
            .custom-tooltip {
                font-size: 12px;
                padding: 6px 8px;
                background-color: rgba(255, 255, 255, 0.95);
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
                border: 1px solid #dadce0;
            }
            
            .tooltip-title {
                font-weight: bold;
                margin-bottom: 4px;
                color: #1a73e8;
            }
            
            .tooltip-address {
                font-style: italic;
                margin-bottom: 4px;
                color: #5f6368;
            }
            
            .store-tooltip div,
            .seller-tooltip div {
                margin-bottom: 3px;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    /**
     * Load GeoJSON data for map boundaries
     */
    async loadGeoData() {
        try {
            // Load US states boundaries
            const response = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
            if (!response.ok) {
                throw new Error(`Failed to load GeoJSON data: ${response.status}`);
            }
            this.geoData = await response.json();
            console.log('GeoJSON data loaded successfully');
            return this.geoData;
        } catch (error) {
            console.error('Error loading GeoJSON data:', error);
            // Try alternative source if primary fails
            try {
                const altResponse = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/us-states.geojson');
                if (altResponse.ok) {
                    this.geoData = await altResponse.json();
                    console.log('GeoJSON data loaded from alternate source');
                    return this.geoData;
                }
            } catch (altError) {
                console.error('Alternative GeoJSON source also failed:', altError);
            }
            throw error;
        }
    }
    
    /**
     * Render the nation-level heatmap
     * @param {Array} statesData - GMV data by state
     */
    renderNationMap(statesData = []) {
        console.log('Rendering nation map with', statesData.length, 'states');
        this.currentLevel = 'nation';
        this.currentState = null;
        this.currentCity = null;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // Adjust map view
        this.map.setView(this.mapOptions.nation.center, this.mapOptions.nation.zoom);
        
        // If no data provided or no GeoJSON, just render the base map
        if (!statesData || statesData.length === 0 || !this.geoData) {
            console.warn('No states data or GeoJSON data available');
            if (this.geoData) {
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
            }
            return;
        }
        
        // Find min and max GMV values
        let gmvValues = statesData.map(d => {
            // Handle both lowercase and uppercase property names (snowflake may return uppercase)
            const gmv = d.total_gmv || d.TOTAL_GMV || 0;
            return Number(gmv);
        }).filter(v => v > 0);
        
        if (gmvValues.length === 0) {
            gmvValues = [0, 1]; // Default if no valid GMV values
        }
        
        const minGMV = Math.min(...gmvValues);
        const maxGMV = Math.max(...gmvValues);
        
        console.log('GMV range:', minGMV, 'to', maxGMV);
        
        // Create a map of state name to data for quicker lookup
        const stateDataMap = {};
        statesData.forEach(data => {
            if (!data) return;
            
            // Get state name handling both lowercase and uppercase properties
            const stateName = data.state || data.STATE;
            if (!stateName) return;
            
            // Try to handle both full state names and state codes
            stateDataMap[stateName.toUpperCase()] = data;
            
            // Also add state codes if available
            const stateCode = this.getStateCodeFromName(stateName);
            if (stateCode) {
                stateDataMap[stateCode] = data;
            }
        });
        
        // Create GeoJSON layer with heatmap colors
        this.dataLayer = L.geoJSON(this.geoData, {
            style: (feature) => {
                const stateName = feature.properties.name;
                
                if (!stateName) {
                    console.warn('Feature has no name property:', feature);
                    return this.styleOptions.nationDefault;
                }
                
                const stateCode = this.getStateCodeFromName(stateName);
                
                // Try to find data by state name or code
                let stateData = stateDataMap[stateName.toUpperCase()] || stateDataMap[stateCode];
                
                // If not found, try checking for a case-insensitive match
                if (!stateData) {
                    const matchKey = Object.keys(stateDataMap).find(key => 
                        key && stateName && (
                            key.toUpperCase() === stateName.toUpperCase() || 
                            key === stateCode
                        )
                    );
                    if (matchKey) {
                        stateData = stateDataMap[matchKey];
                    }
                }
                
                let fillColor = '#f5f5f5'; // Default color for states with no data
                
                if (stateData) {
                    const gmv = Number(stateData.total_gmv || stateData.TOTAL_GMV || 0);
                    if (gmv > 0) {
                        fillColor = getHeatmapColor(gmv, minGMV, maxGMV);
                    }
                }
                
                return {
                    ...this.styleOptions.nationDefault,
                    fillColor
                };
            },
            onEachFeature: (feature, layer) => {
                const stateName = feature.properties.name;
                const stateCode = this.getStateCodeFromName(stateName);
                
                const stateData = stateDataMap[stateName.toUpperCase()] || 
                                  stateDataMap[stateCode] || 
                                  {
                                    state: stateName,
                                    store_count: 0,
                                    total_gmv: 0
                                  };
                
                layer.on({
                    mouseover: (e) => {
                        this.highlightFeature(e);
                        
                        // Dispatch hover event with state data
                        const event = new CustomEvent('regionHover', {
                            detail: {
                                region: stateName,
                                data: stateData
                            }
                        });
                        document.dispatchEvent(event);
                    },
                    mouseout: this.resetHighlight.bind(this),
                    click: (e) => {
                        // Dispatch custom event for state click
                        const event = new CustomEvent('stateClick', { detail: { state: stateName } });
                        document.dispatchEvent(event);
                    }
                });
            }
        }).addTo(this.map);
    }
    
    /**
     * Get state code from name
     * @param {string} stateName - The state name
     * @returns {string} The state code
     */
    getStateCodeFromName(stateName) {
        const stateNameToCode = {
            'alabama': 'AL',
            'alaska': 'AK',
            'arizona': 'AZ',
            'arkansas': 'AR',
            'california': 'CA',
            'colorado': 'CO',
            'connecticut': 'CT',
            'delaware': 'DE',
            'florida': 'FL',
            'georgia': 'GA',
            'hawaii': 'HI',
            'idaho': 'ID',
            'illinois': 'IL',
            'indiana': 'IN',
            'iowa': 'IA',
            'kansas': 'KS',
            'kentucky': 'KY',
            'louisiana': 'LA',
            'maine': 'ME',
            'maryland': 'MD',
            'massachusetts': 'MA',
            'michigan': 'MI',
            'minnesota': 'MN',
            'mississippi': 'MS',
            'missouri': 'MO',
            'montana': 'MT',
            'nebraska': 'NE',
            'nevada': 'NV',
            'new hampshire': 'NH',
            'new jersey': 'NJ',
            'new mexico': 'NM',
            'new york': 'NY',
            'north carolina': 'NC',
            'north dakota': 'ND',
            'ohio': 'OH',
            'oklahoma': 'OK',
            'oregon': 'OR',
            'pennsylvania': 'PA',
            'rhode island': 'RI',
            'south carolina': 'SC', 
            'south dakota': 'SD',
            'tennessee': 'TN',
            'texas': 'TX',
            'utah': 'UT',
            'vermont': 'VT',
            'virginia': 'VA',
            'washington': 'WA',
            'west virginia': 'WV',
            'wisconsin': 'WI',
            'wyoming': 'WY',
            'district of columbia': 'DC'
        };
        
        // Check if it's already a code
        if (stateName && stateName.length === 2 && stateName === stateName.toUpperCase()) {
            return stateName;
        }
        
        return stateName && typeof stateName === 'string' ? stateNameToCode[stateName.toLowerCase()] : null;
    }
    
    /**
     * Render the state-level map with stores and sellers
     * @param {string} stateName - The state name
     * @param {Array} storesData - Store data with coordinates
     * @param {Array} sellersData - Seller data with coordinates
     */
    renderStoresAndSellers(stateName, storesData = [], sellersData = []) {
        console.log(`Rendering ${storesData.length} stores and ${sellersData.length} sellers for ${stateName}`);
        
        // Validate inputs
        if (!stateName) {
            console.error('State name is required');
            return;
        }
        
        if (!storesData || !Array.isArray(storesData)) {
            storesData = [];
        }
        
        if (!sellersData || !Array.isArray(sellersData)) {
            sellersData = [];
        }
        
        // Set current state
        this.currentLevel = 'state';
        this.currentState = stateName;
        this.currentCity = null;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // Find the state in the GeoJSON data
        const stateFeature = this.geoData.features.find(f => 
            f.properties.name && stateName && 
            f.properties.name.toLowerCase() === stateName.toLowerCase()
        );
        
        if (!stateFeature) {
            console.error(`State not found in GeoJSON: ${stateName}`);
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
        
        // Create layers for stores and sellers
        const storesLayer = L.layerGroup();
        const sellersLayer = L.layerGroup();
        const connectionsLayer = L.layerGroup();
        
        // Find min and max values for GMV for color scaling
        const gmvValues = storesData.map(store => Number(store.GMV_LAST_MONTH || store.gmv_last_month || 0));
        const validGmvValues = gmvValues.filter(v => v > 0);
        const minGMV = validGmvValues.length > 0 ? Math.min(...validGmvValues) : 0;
        const maxGMV = validGmvValues.length > 0 ? Math.max(...validGmvValues) : 1;
        
        // Create seller markers
        const sellerMarkers = {};
        
        sellersData.forEach(seller => {
            // Normalize properties
            const sellerId = seller.SELLER_ID || seller.seller_id;
            const latitude = seller.LATITUDE || seller.latitude;
            const longitude = seller.LONGITUDE || seller.longitude;
            const sellerName = seller.SELLER_FULL_NAME || seller.seller_full_name || 
                              `${seller.SELLER_FIRST_NAME || seller.seller_first_name || ''} ${seller.SELLER_LAST_NAME || seller.seller_last_name || ''}`.trim() || 
                              `Seller ${sellerId}`;
            
            // Create a cross marker for sellers
            const sellerIcon = L.divIcon({
                html: `<div class="seller-cross"></div>`,
                className: 'seller-marker',
                iconSize: [20, 20]
            });
            
            const marker = L.marker([latitude, longitude], {
                icon: sellerIcon
            });
            
            // Add hover functionality for sellers
            marker.on('mouseover', (e) => {
                // Dispatch hover event with seller data
                const event = new CustomEvent('sellerHover', {
                    detail: { seller }
                });
                document.dispatchEvent(event);
            });
            
            // Add tooltip
            const tooltipContent = `
                <div class="seller-tooltip">
                    <div class="tooltip-title">${sellerName}</div>
                    <div>GMV Last Month: ${formatCurrency(seller.GMV_LAST_MONTH || seller.gmv_last_month || 0)}</div>
                    <div>GMV Month-to-Date: ${formatCurrency(seller.GMV_MTD || seller.gmv_mtd || 0)}</div>
                    <div>Stores Last Month: ${formatNumber(seller.STORES_LAST_MONTH || seller.stores_last_month || 0)}</div>
                </div>
            `;
            
            marker.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip'
            });
            
            // Store seller marker for later reference
            sellerMarkers[sellerId] = marker;
            sellersLayer.addLayer(marker);
        });
        
        // Create store markers
        storesData.forEach(store => {
            // Normalize properties
            const storeId = store.STORE_ID || store.store_id;
            const latitude = store.LATITUDE || store.latitude;
            const longitude = store.LONGITUDE || store.longitude;
            const sellerId = store.SELLER_ID || store.seller_id || store.LATEST_SELLER_ID || store.latest_seller_id;
            const sellerName = store.SELLER_FULL_NAME || store.seller_full_name || 
                              `${store.SELLER_FIRST_NAME || store.seller_first_name || ''} ${store.SELLER_LAST_NAME || store.seller_last_name || ''}`.trim() || 
                              `Seller ${sellerId}`;
            
            const storeName = store.STORE_LOCATION_NAME || store.store_location_name || `Store #${storeId}`;
            const storeAddress = store.STORE_ADDRESS || store.store_address || 'Address not available';
            const storeCity = store.STORE_CITY || store.store_city || '';
            const storeState = store.STORE_STATE || store.store_state || stateName;
            
            const gmvLastMonth = Number(store.GMV_LAST_MONTH || store.gmv_last_month || 0);
            const gmvMTD = Number(store.GMV_CURRENT_MONTH || store.gmv_current_month || 0);
            const lifetimeGMV = Number(store.STORE_LIFETIME_GMV || store.store_lifetime_gmv || 0);
            
            // Calculate size and color based on GMV
            const radius = calculateMarkerSize(gmvLastMonth, minGMV, maxGMV);
            const color = getHeatmapColor(gmvLastMonth, minGMV, maxGMV);
            
            const marker = L.circleMarker([latitude, longitude], {
                radius,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            // Add hover functionality
            marker.on('mouseover', (e) => {
                // Highlight the marker
                e.target.setStyle({
                    fillOpacity: 1,
                    weight: 3
                });
                
                // Dispatch hover event with store data
                const event = new CustomEvent('storeHover', {
                    detail: { 
                        store: {
                            ...store,
                            // Add normalized properties for display
                            STORE_ID: storeId,
                            STORE_LOCATION_NAME: storeName,
                            STORE_ADDRESS: storeAddress,
                            STORE_CITY: storeCity,
                            STORE_STATE: storeState,
                            GMV_LAST_MONTH: gmvLastMonth,
                            GMV_CURRENT_MONTH: gmvMTD,
                            STORE_LIFETIME_GMV: lifetimeGMV,
                            SELLER_FULL_NAME: sellerName,
                            SELLER_ID: sellerId
                        }
                    }
                });
                document.dispatchEvent(event);
                
                // Highlight connection to seller if exists
                if (sellerId && sellerMarkers[sellerId]) {
                    // Draw temporary connection line
                    const sellerLatLng = sellerMarkers[sellerId].getLatLng();
                    const storeLine = L.polyline(
                        [
                            [latitude, longitude],
                            [sellerLatLng.lat, sellerLatLng.lng]
                        ],
                        {
                            color: '#fbbc04',
                            weight: 3,
                            opacity: 0.9,
                            dashArray: '5, 5',
                            className: 'highlight-connection'
                        }
                    ).addTo(connectionsLayer);
                    
                    // Highlight the seller marker
                    sellerMarkers[sellerId].getElement().classList.add('highlighted');
                }
            });
            
            marker.on('mouseout', (e) => {
                // Reset marker style
                e.target.setStyle({
                    fillOpacity: 0.8,
                    weight: 2
                });
                
                // Clear connection layer
                connectionsLayer.clearLayers();
                
                // Remove highlighted class from seller markers
                Object.values(sellerMarkers).forEach(sellerMarker => {
                    if (sellerMarker.getElement()) {
                        sellerMarker.getElement().classList.remove('highlighted');
                    }
                });
            });
            
            // Add click functionality
            marker.on('click', (e) => {
                // Navigate to the city view
                const event = new CustomEvent('cityClick', {
                    detail: {
                        city: storeCity,
                        state: storeState
                    }
                });
                document.dispatchEvent(event);
            });
            
            // Add tooltip
            const tooltipContent = `
                <div class="store-tooltip">
                    <div class="tooltip-title">${storeName}</div>
                    <div class="tooltip-address">${storeAddress}, ${storeCity}</div>
                    <div>GMV Last Month: ${formatCurrency(gmvLastMonth)}</div>
                    <div>GMV Month-to-Date: ${formatCurrency(gmvMTD)}</div>
                    <div>Lifetime GMV: ${formatCurrency(lifetimeGMV)}</div>
                    <div>Seller: ${sellerName}</div>
                </div>
            `;
            
            marker.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip'
            });
            
            storesLayer.addLayer(marker);
        });
        
        // Add layers to map
        connectionsLayer.addTo(this.map);
        storesLayer.addTo(this.map);
        sellersLayer.addTo(this.map);
        
        // Store layers for later reference
        this.storesLayer = storesLayer;
        this.sellersLayer = sellersLayer;
        this.connectionsLayer = connectionsLayer;
        
        // Add legend
        this.addStoreSellerLegend(minGMV, maxGMV);
    }
    
    /**
     * Add legend for stores and sellers
     * @param {number} minGMV - Minimum GMV value
     * @param {number} maxGMV - Maximum GMV value
     */
    addStoreSellerLegend(minGMV, maxGMV) {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.2);">
                    <div style="margin-bottom: 8px; font-weight: bold; font-size: 13px;">Map Legend</div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor(minGMV, minGMV, maxGMV)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">Store - Low GMV (${formatCurrency(minGMV)})</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor(maxGMV, minGMV, maxGMV)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">Store - High GMV (${formatCurrency(maxGMV)})</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div class="seller-cross" style="transform: rotate(45deg); width: 12px; height: 12px; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">Seller Location</div>
                    </div>
                    
                    <div style="display: flex; align-items: center;">
                        <div style="width: 20px; height: 2px; background-color: #fbbc04; margin-right: 5px; border-top: 1px dashed #fbbc04;"></div>
                        <div style="font-size: 12px;">Store-Seller Connection</div>
                    </div>
                    
                    <div style="margin-top: 8px; font-size: 11px; color: #5f6368;">
                        Hover over stores and sellers to see details
                    </div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    /**
     * Render state-level map with cities data
     * @param {string} stateName - The state name
     * @param {Array} citiesData - GMV data by city
     * @param {string} metricType - The metric to visualize
     */
    renderStateMap(stateName, citiesData = [], metricType = 'total_gmv') {
        console.log(`Rendering state map for ${stateName} with ${citiesData.length} cities, metric: ${metricType}`);
        
        // Set current state
        this.currentLevel = 'state';
        this.currentState = stateName;
        this.currentCity = null;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // First try to fetch individual stores and sellers
        showLoading(`Loading stores and sellers for ${stateName}...`);
        
        fetch(`/api/state-stores/${encodeURIComponent(stateName)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch stores: ${response.status}`);
                }
                return response.json();
            })
            .then(storesData => {
                // Check for valid data
                if (!storesData || !Array.isArray(storesData) || storesData.length === 0) {
                    console.warn(`No store data available for ${stateName}`);
                    hideLoading();
                    
                    // Fall back to city-based visualization if no individual stores
                    if (citiesData && citiesData.length > 0) {
                        this.renderStateMapWithCities(stateName, citiesData, metricType);
                    }
                    return;
                }
                
                // Filter stores with valid coordinates
                const validStores = storesData.filter(store => 
                    store && 
                    (store.LATITUDE !== undefined || store.latitude !== undefined) && 
                    (store.LONGITUDE !== undefined || store.longitude !== undefined)
                );
                
                if (validStores.length === 0) {
                    console.warn(`No stores with valid coordinates for ${stateName}`);
                    hideLoading();
                    
                    // Fall back to city-based visualization
                    if (citiesData && citiesData.length > 0) {
                        this.renderStateMapWithCities(stateName, citiesData, metricType);
                    }
                    return;
                }
                
                // Fetch sellers data for this state
                return fetch(`/api/state-sellers/${encodeURIComponent(stateName)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch sellers: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(sellersData => {
                        // Render both stores and sellers
                        this.renderStoresAndSellers(stateName, validStores, sellersData || []);
                        hideLoading();
                    })
                    .catch(error => {
                        console.error('Error fetching sellers:', error);
                        // Still render stores even if sellers fetch fails
                        this.renderStoresAndSellers(stateName, validStores, []);
                        hideLoading();
                    });
            })
            .catch(error => {
                console.error('Error fetching stores:', error);
                hideLoading();
                
                // Fall back to city-based visualization on error
                if (citiesData && citiesData.length > 0) {
                    this.renderStateMapWithCities(stateName, citiesData, metricType);
                }
            });
    }
    
    /**
     * Fallback method to render state with cities
     * @param {string} stateName - The state name
     * @param {Array} citiesData - GMV data by city
     * @param {string} metricType - The metric to visualize
     */
    renderStateMapWithCities(stateName, citiesData = [], metricType = 'total_gmv') {
        console.log(`Falling back to city-based map for ${stateName} with ${citiesData.length} cities, metric: ${metricType}`);
        
        // Validate input
        if (!citiesData || !Array.isArray(citiesData)) {
            console.warn(`No valid city data available for ${stateName}`);
            return;
        }
        
        // Set current state
        this.currentLevel = 'state';
        this.currentState = stateName;
        this.currentCity = null;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // Find the state in the GeoJSON data
        const stateFeature = this.geoData.features.find(f => 
            f.properties.name && stateName && 
            f.properties.name.toLowerCase() === stateName.toLowerCase()
        );
        
        if (!stateFeature) {
            console.error(`State not found in GeoJSON: ${stateName}`);
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
        
        // Check for valid coordinates
        const validCities = citiesData.filter(city => 
            city && 
            (city.latitude !== undefined || city.LATITUDE !== undefined) && 
            (city.longitude !== undefined || city.LONGITUDE !== undefined)
        );
        console.log(`${validCities.length} of ${citiesData.length} cities have valid coordinates`);
        
        if (validCities.length === 0) {
            console.warn('No cities with valid coordinates to render');
            return;
        }
        
        // Find min and max values for the selected metric
        let metricValues = [];
        let metricName = "";
        
        switch(metricType) {
            case 'store_count':
                metricValues = validCities.map(d => Number(d.store_count || d.STORE_COUNT || 0));
                metricName = 'Store Count';
                break;
            case 'avg_gmv_per_store':
                metricValues = validCities.map(d => {
                    const storeCount = Number(d.store_count || d.STORE_COUNT || 0);
                    const totalGmv = Number(d.total_gmv || d.TOTAL_GMV || 0);
                    return storeCount > 0 ? totalGmv / storeCount : 0;
                });
                metricName = 'Avg GMV Per Store';
                break;
            case 'total_gmv':
            default:
                metricValues = validCities.map(d => Number(d.total_gmv || d.TOTAL_GMV || 0));
                metricName = 'Total GMV';
                break;
        }
        
        const validValues = metricValues.filter(v => v > 0);
        const minValue = validValues.length > 0 ? Math.min(...validValues) : 0;
        const maxValue = validValues.length > 0 ? Math.max(...validValues) : 1;
        
        console.log(`Metric ${metricName} range: ${minValue} - ${maxValue}`);
        
        // Add city markers with heatmap colors
        const cityMarkers = L.layerGroup();
        
        validCities.forEach(cityData => {
            // Get normalized property names
            const city = cityData.city || cityData.CITY || 'Unknown';
            const latitude = cityData.latitude || cityData.LATITUDE;
            const longitude = cityData.longitude || cityData.LONGITUDE;
            const storeCount = Number(cityData.store_count || cityData.STORE_COUNT || 0);
            const totalGmv = Number(cityData.total_gmv || cityData.TOTAL_GMV || 0);
            
            if (latitude && longitude) {
                // Get the metric value
                let metricValue;
                switch(metricType) {
                    case 'store_count':
                        metricValue = storeCount;
                        break;
                    case 'avg_gmv_per_store':
                        metricValue = storeCount > 0 ? totalGmv / storeCount : 0;
                        break;
                    case 'total_gmv':
                    default:
                        metricValue = totalGmv;
                        break;
                }
                
                const radius = calculateMarkerSize(metricValue, minValue, maxValue);
                const color = getHeatmapColor(metricValue, minValue, maxValue);
                
                const marker = L.circleMarker([latitude, longitude], {
                    radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                marker.cityData = cityData;
                marker.metricType = metricType;
                marker.metricValue = metricValue;
                marker.metricName = metricName;
                
                marker.on('mouseover', (e) => {
                    // Highlight the marker
                    e.target.setStyle({
                        fillOpacity: 1,
                        weight: 2
                    });
                    
                    // Dispatch hover event with city data
                    const event = new CustomEvent('regionHover', {
                        detail: {
                            region: city,
                            data: cityData,
                            metricType: metricType,
                            metricValue: metricValue,
                            metricName: metricName
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
                            city: city,
                            state: this.currentState
                        }
                    });
                    document.dispatchEvent(event);
                });
                
                // Add tooltip
                let tooltipContent = `<div class="tooltip"><strong>${city}</strong><br>${metricName}: `;
                
                if (metricType === 'store_count') {
                    tooltipContent += formatNumber(metricValue);
                } else {
                    tooltipContent += formatCurrency(metricValue);
                }
                
                tooltipContent += `<br>Stores: ${formatNumber(storeCount)}</div>`;
                
                marker.bindTooltip(tooltipContent, {
                    permanent: false,
                    direction: 'top',
                    className: 'custom-tooltip'
                });
                
                cityMarkers.addLayer(marker);
            }
        });
        
        cityMarkers.addTo(this.map);
        this.dataLayer = cityMarkers;
        
        // Add legend
        this.addCityLegend(metricName, minValue, maxValue, metricType);
    }
    
    /**
     * Add legend for city metrics
     * @param {string} metricName - Name of the metric
     * @param {number} minValue - Minimum value
     * @param {number} maxValue - Maximum value
     * @param {string} metricType - Type of metric ('total_gmv', 'store_count', 'avg_gmv_per_store')
     */
    addCityLegend(metricName, minValue, maxValue, metricType) {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'info legend');
            
            // Format min and max values according to metric type
            let minValueFormatted, maxValueFormatted;
            
            if (metricType === 'store_count') {
                minValueFormatted = formatNumber(minValue);
                maxValueFormatted = formatNumber(maxValue);
            } else {
                minValueFormatted = formatCurrency(minValue);
                maxValueFormatted = formatCurrency(maxValue);
            }
            
            div.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.2);">
                    <div style="margin-bottom: 8px; font-weight: bold; font-size: 13px;">${metricName} by City</div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor(minValue, minValue, maxValue)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">${minValueFormatted}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor((minValue + maxValue) / 2, minValue, maxValue)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">${metricType === 'store_count' ? 
                            formatNumber((minValue + maxValue) / 2) : 
                            formatCurrency((minValue + maxValue) / 2)}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor(maxValue, minValue, maxValue)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">${maxValueFormatted}</div>
                    </div>
                    
                    <div style="margin-top: 8px; font-size: 11px; color: #5f6368;">
                        Circle size indicates ${metricName.toLowerCase()}
                    </div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    /**
     * Render the city-level map with store locations
     * @param {string} cityName - The city name
     * @param {string} stateName - The state name
     * @param {Array} storesData - Store data
     */
    renderCityMap(cityName, stateName, storesData = []) {
        console.log(`Rendering city map for ${cityName}, ${stateName} with ${storesData.length} stores`);
        
        // Validate input
        if (!cityName || !stateName) {
            console.error('City name and state name are required');
            return;
        }
        
        if (!storesData || !Array.isArray(storesData)) {
            console.warn(`No valid store data available for ${cityName}, ${stateName}`);
            storesData = [];
        }
        
        this.currentLevel = 'city';
        this.currentState = stateName;
        this.currentCity = cityName;
        this.isNetworkView = false;
        
        // Clear previous layers
        this.clearLayers();
        
        // Filter stores with valid coordinates
        const validCoords = storesData.filter(s => 
            s && s.LATITUDE !== undefined && s.LONGITUDE !== undefined
        );
        
        if (validCoords.length === 0) {
            console.error('No valid coordinates for stores in this city');
            // Create a fallback view centered on the state
            const stateFeature = this.geoData.features.find(f => 
                f.properties.name && stateName && 
                f.properties.name.toLowerCase() === stateName.toLowerCase()
            );
            
            if (stateFeature) {
                const bounds = L.geoJSON(stateFeature).getBounds();
                this.map.fitBounds(bounds);
            } else {
                this.map.setView(this.mapOptions.nation.center, this.mapOptions.city.zoom);
            }
            return;
        }
        
        // Calculate average lat/lng to center the map
        const avgLat = validCoords.reduce((sum, s) => sum + s.LATITUDE, 0) / validCoords.length;
        const avgLng = validCoords.reduce((sum, s) => sum + s.LONGITUDE, 0) / validCoords.length;
        
        // Set map view
        this.map.setView([avgLat, avgLng], this.mapOptions.city.zoom);
        
        // Find min and max GMV values
        const gmvValues = validCoords.map(s => Number(s.GMV_LAST_MONTH || 0));
        const validGmvValues = gmvValues.filter(v => v > 0);
        const minGMV = validGmvValues.length > 0 ? Math.min(...validGmvValues) : 0;
        const maxGMV = validGmvValues.length > 0 ? Math.max(...validGmvValues) : 1;
        
        console.log(`Store GMV range: ${minGMV} - ${maxGMV}`);
        
        // Create store markers
        const storeMarkers = L.layerGroup();
        
        validCoords.forEach(store => {
            const gmv = Number(store.GMV_LAST_MONTH || 0);
            const radius = calculateMarkerSize(gmv, minGMV, maxGMV);
            const color = getHeatmapColor(gmv, minGMV, maxGMV);
            
            const marker = L.circleMarker([store.LATITUDE, store.LONGITUDE], {
                radius,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            // Format store data for display
            const storeName = store.STORE_LOCATION_NAME || 'Store #' + store.STORE_ID;
            const storeAddress = store.STORE_ADDRESS || 'Address not available';
            const storeCity = store.STORE_CITY || cityName;
            const storeState = store.STORE_STATE || stateName;
            const storeGmv = formatCurrency(store.GMV_LAST_MONTH || 0);
            const lifetimeGmv = formatCurrency(store.STORE_LIFETIME_GMV || 0);
            const lifetimeOrders = formatNumber(store.STORE_LIFETIME_ORDERS || 0);
            
            // Add hover functionality
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
            
            // Popup content
            const popupContent = `
                <div class="store-popup">
                    <div class="store-popup-header">${storeName}</div>
                    <div class="store-popup-address">${storeAddress}, ${storeCity}, ${storeState}</div>
                    <div class="store-popup-stat">
                        <span class="store-popup-label">GMV (Last Month):</span>
                        <span class="store-popup-value">${storeGmv}</span>
                    </div>
                    <div class="store-popup-stat">
                        <span class="store-popup-label">Lifetime GMV:</span>
                        <span class="store-popup-value">${lifetimeGmv}</span>
                    </div>
                    <div class="store-popup-stat">
                        <span class="store-popup-label">Lifetime Orders:</span>
                        <span class="store-popup-value">${lifetimeOrders}</span>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            
            storeMarkers.addLayer(marker);
        });
        
        storeMarkers.addTo(this.map);
        this.dataLayer = storeMarkers;
        
        // Add legend
        this.addStoreLegend(minGMV, maxGMV);
    }
    
    /**
     * Add legend for store GMV
     * @param {number} minGMV - Minimum GMV value
     * @param {number} maxGMV - Maximum GMV value
     */
    addStoreLegend(minGMV, maxGMV) {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.2);">
                    <div style="margin-bottom: 8px; font-weight: bold; font-size: 13px;">Store GMV Legend</div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor(minGMV, minGMV, maxGMV)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">${formatCurrency(minGMV)}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor((minGMV + maxGMV) / 2, minGMV, maxGMV)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">${formatCurrency((minGMV + maxGMV) / 2)}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getHeatmapColor(maxGMV, minGMV, maxGMV)}; margin-right: 5px;"></div>
                        <div style="font-size: 12px;">${formatCurrency(maxGMV)}</div>
                    </div>
                    
                    <div style="margin-top: 8px; font-size: 11px; color: #5f6368;">
                        Circle size indicates GMV (Last Month)
                    </div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    /**
     * Render network view showing connections between stores and sellers
     * @param {string} cityName - The city name
     * @param {string} stateName - The state name
     * @param {Array} networkData - Network connection data
     */
    renderNetworkView(cityName, stateName, networkData = []) {
        console.log(`Rendering network view for ${cityName}, ${stateName} with ${networkData.length} connections`);
        
        // Validate input
        if (!cityName || !stateName) {
            console.error('City name and state name are required');
            return;
        }
        
        if (!networkData || !Array.isArray(networkData)) {
            console.warn(`No valid network data available for ${cityName}, ${stateName}`);
            networkData = [];
        }
        
        this.currentLevel = 'city';
        this.currentState = stateName;
        this.currentCity = cityName;
        this.isNetworkView = true;
        
        // Clear previous layers
        this.clearLayers();
        
        // Filter entries with valid coordinates
        const validCoords = networkData.filter(n => 
            n && 
            n.store_lat !== undefined && n.store_lng !== undefined && 
            n.seller_lat !== undefined && n.seller_lng !== undefined
        );
        
        if (validCoords.length === 0) {
            console.error('No valid coordinates for network data');
            // Create a fallback view
            this.map.setView(this.mapOptions.nation.center, this.mapOptions.city.zoom);
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
        validCoords.forEach(item => {
            // Get or create store marker
            if (!storeMarkers[item.STORE_ID]) {
                const storeName = item.STORE_LOCATION_NAME || 'Store #' + item.STORE_ID;
                
                const storeMarker = L.circleMarker([item.store_lat, item.store_lng], {
                    radius: 8,
                    fillColor: '#1a73e8',
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                storeMarker.bindTooltip(`Store: ${storeName}`, {
                    permanent: false,
                    direction: 'top'
                });
                
                // Add popup with store details
                storeMarker.bindPopup(`
                    <div class="store-popup">
                        <div class="store-popup-header">${storeName}</div>
                        <div class="store-popup-address">Location: (${item.store_lat.toFixed(4)}, ${item.store_lng.toFixed(4)})</div>
                        <div class="store-popup-note">This store is connected to ${validCoords.filter(n => n.STORE_ID === item.STORE_ID).length} sellers</div>
                    </div>
                `);
                
                networkLayer.addLayer(storeMarker);
                storeMarkers[item.STORE_ID] = storeMarker;
            }
            
            // Get or create seller marker
            if (!sellerMarkers[item.SELLER_ID]) {
                const sellerName = item.SELLER_FULL_NAME || 'Seller #' + item.SELLER_ID;
                
                const sellerIcon = L.divIcon({
                    html: `<div class="seller-cross"></div>`,
                    className: 'seller-marker',
                    iconSize: [20, 20]
                });
                
                const sellerMarker = L.marker([item.seller_lat, item.seller_lng], {
                    icon: sellerIcon
                });
                
                // Add hover functionality
                sellerMarker.on('mouseover', (e) => {
                    // Highlight all connections to this seller
                    const associatedStores = validCoords.filter(n => n.SELLER_ID === item.SELLER_ID);
                    
                    // Add highlighted connections
                    associatedStores.forEach(connection => {
                        const storeLat = connection.store_lat;
                        const storeLng = connection.store_lng;
                        
                        // Create a highlighted connection line
                        const highlightLine = L.polyline(
                            [
                                [item.seller_lat, item.seller_lng],
                                [storeLat, storeLng]
                            ],
                            {
                                color: '#fbbc04',
                                weight: 4,
                                opacity: 1,
                                dashArray: '',
                                className: 'highlight-connection'
                            }
                        );
                        
                        networkLayer.addLayer(highlightLine);
                        
                        // Highlight the associated store
                        if (storeMarkers[connection.STORE_ID]) {
                            storeMarkers[connection.STORE_ID].setStyle({
                                fillOpacity: 1,
                                weight: 3
                            });
                        }
                    });
                    
                    // Dispatch seller hover event
                    const event = new CustomEvent('sellerHover', {
                        detail: { seller: item }
                    });
                    document.dispatchEvent(event);
                });
                
                sellerMarker.on('mouseout', (e) => {
                    // Remove highlighted connections
                    networkLayer.eachLayer(layer => {
                        if (layer._path && layer._path.classList.contains('highlight-connection')) {
                            networkLayer.removeLayer(layer);
                        }
                    });
                    
                    // Reset store markers
                    Object.values(storeMarkers).forEach(marker => {
                        if (marker.setStyle) {
                            marker.setStyle({
                                fillOpacity: 0.8,
                                weight: 2
                            });
                        }
                    });
                });
                
                // Add tooltip
                sellerMarker.bindTooltip(`Seller: ${sellerName}`, {
                    permanent: false,
                    direction: 'top',
                    className: 'custom-tooltip'
                });
                
                // Add popup with seller details
                sellerMarker.bindPopup(`
                    <div class="seller-popup">
                        <div class="seller-popup-header">${sellerName}</div>
                        <div class="seller-popup-address">Location: (${item.seller_lat.toFixed(4)}, ${item.seller_lng.toFixed(4)})</div>
                        <div class="seller-popup-note">
                            Connected to ${validCoords.filter(n => n.SELLER_ID === item.SELLER_ID).length} stores
                        </div>
                    </div>
                `);
                
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
            
            // Add hover effect for the connection
            line.on('mouseover', (e) => {
                e.target.setStyle({
                    weight: 4,
                    opacity: 1,
                    dashArray: ''
                });
                
                // Highlight connected store and seller
                if (storeMarkers[item.STORE_ID]) {
                    storeMarkers[item.STORE_ID].setStyle({
                        fillOpacity: 1,
                        weight: 3
                    });
                }
                
                if (sellerMarkers[item.SELLER_ID] && sellerMarkers[item.SELLER_ID].getElement) {
                    sellerMarkers[item.SELLER_ID].getElement().classList.add('highlighted');
                }
                
                // Show connection info in a tooltip
                const connectionGMV = item.connection_gmv || 0;
                const connectionCount = item.connection_count || 0;
                
                const tooltipContent = `
                    <div class="connection-tooltip">
                        <div><strong>Store:</strong> ${item.STORE_LOCATION_NAME || 'Store #' + item.STORE_ID}</div>
                        <div><strong>Seller:</strong> ${item.SELLER_FULL_NAME || 'Seller #' + item.SELLER_ID}</div>
                        <div><strong>Orders:</strong> ${connectionCount}</div>
                        <div><strong>GMV:</strong> ${formatCurrency(connectionGMV)}</div>
                    </div>
                `;
                
                const tooltip = L.tooltip({
                    permanent: false,
                    direction: 'top',
                    className: 'custom-tooltip'
                })
                .setLatLng([
                    (item.store_lat + item.seller_lat) / 2,
                    (item.store_lng + item.seller_lng) / 2
                ])
                .setContent(tooltipContent)
                .addTo(this.map);
                
                // Store the tooltip reference for removal
                line.tooltip = tooltip;
            });
            
            line.on('mouseout', (e) => {
                e.target.setStyle({
                    weight: 2,
                    opacity: 0.7,
                    dashArray: '5, 5'
                });
                
                // Reset store and seller highlighting
                if (storeMarkers[item.STORE_ID]) {
                    storeMarkers[item.STORE_ID].setStyle({
                        fillOpacity: 0.8,
                        weight: 2
                    });
                }
                
                if (sellerMarkers[item.SELLER_ID] && sellerMarkers[item.SELLER_ID].getElement) {
                    sellerMarkers[item.SELLER_ID].getElement().classList.remove('highlighted');
                }
                
                // Remove the tooltip
                if (line.tooltip) {
                    this.map.removeLayer(line.tooltip);
                    line.tooltip = null;
                }
            });
            
            networkLayer.addLayer(line);
        });
        
        // Add legend for network view
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <div style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.2);">
                    <div style="margin-bottom: 5px; font-weight: bold;">Network Legend</div>
                    <div style="display: flex; align-items: center; margin-bottom: 5px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #1a73e8; margin-right: 5px;"></div>
                        <div>Stores (${Object.keys(storeMarkers).length})</div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 5px;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #34a853; margin-right: 5px;"></div>
                        <div>Sellers (${Object.keys(sellerMarkers).length})</div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div style="width: 20px; height: 2px; background-color: #fbbc04; margin-right: 5px; border-top: 1px dashed #fbbc04;"></div>
                        <div>Connections (${validCoords.length})</div>
                    </div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
        
        networkLayer.addTo(this.map);
        this.networkLayer = networkLayer;
    }
}
