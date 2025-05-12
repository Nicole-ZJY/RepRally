// Main JavaScript for Home Page

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
    
    // Load user info
    async function loadUserInfo() {
        try {
            const response = await fetch('/api/user/info');
            
            if (response.ok) {
                const userData = await response.json();
                const usernameDisplay = document.getElementById('username-display');
                
                if (userData && userData.username) {
                    usernameDisplay.innerHTML = `<i class="fas fa-user"></i> ${userData.username}`;
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }
    
    // Initialize event listeners
    function initEventListeners() {
        // Go back button
        goBackBtn.addEventListener('click', handleGoBack);
        
        // Toggle network view button
        toggleNetworkBtn.addEventListener('click', handleToggleNetwork);
        
        // Metric selector change
        document.getElementById('metric-select').addEventListener('change', handleMetricChange);
        
        // Custom map events
        document.addEventListener('stateClick', handleStateClick);
        document.addEventListener('cityClick', handleCityClick);
        document.addEventListener('regionHover', handleRegionHover);
        document.addEventListener('storeHover', handleStoreHover);
        document.addEventListener('sellerHover', handleSellerHover);
        document.addEventListener('goToState', (e) => navigateToState(e.detail.state));
        document.addEventListener('goToNation', navigateToNation);
    }
    
    // Handle metric change
    function handleMetricChange(e) {
        const metricType = e.target.value;
        const currentState = mapManager.getCurrentState();
        
        if (currentState.level === 'state' && currentState.state) {
            // Reload state view with new metric
            loadStateData(currentState.state, metricType);
        }
    }
    
    // Load nation-level data
    async function loadNationData() {
        showLoading('Loading national data...');
        
        try {
            const response = await fetch('/api/states-gmv');
            
            if (!response.ok) {
                throw new Error(`Error fetching states data: ${response.status}`);
            }
            
            let statesData = await response.json();
            console.log('Loaded states data:', statesData);
            
            // Fix state data format if needed - convert to proper case
            statesData = statesData.map(state => {
                if (state && typeof state.STATE === 'string' && !state.state) {
                    // Convert Snowflake's uppercase column names to expected format
                    return {
                        state: convertStateCodeToName(state.STATE),
                        store_count: state.STORE_COUNT || 0,
                        total_gmv: state.TOTAL_GMV || 0
                    };
                }
                return state;
            });
            
            console.log('Processed states data:', statesData);
            
            // Validate states data
            if (!Array.isArray(statesData)) {
                console.error('Invalid states data format, should be an array:', statesData);
                statesData = [];
            }
            
            // Filter out any invalid entries
            const filteredData = statesData.filter(state => 
                state && typeof state === 'object' && state.state && 
                typeof state.state === 'string' && 
                !isNaN(state.store_count) && !isNaN(state.total_gmv)
            );
            console.log('Filtered states data:', filteredData);
            
            appState.currentStatesData = filteredData;
            
            // Update UI
            updateNationView(filteredData);
            
            // Render map
            mapManager.renderNationMap(filteredData);
            
            hideLoading();
        } catch (error) {
            console.error('Error loading nation data:', error);
            hideLoading();
            handleApiError(error);
        }
    }
    
    // Helper function to convert state codes to names
    function convertStateCodeToName(stateCode) {
        const stateMap = {
            'AL': 'Alabama',
            'AK': 'Alaska',
            'AZ': 'Arizona',
            'AR': 'Arkansas',
            'CA': 'California',
            'CO': 'Colorado',
            'CT': 'Connecticut',
            'DE': 'Delaware',
            'FL': 'Florida',
            'GA': 'Georgia',
            'HI': 'Hawaii',
            'ID': 'Idaho',
            'IL': 'Illinois',
            'IN': 'Indiana',
            'IA': 'Iowa',
            'KS': 'Kansas',
            'KY': 'Kentucky',
            'LA': 'Louisiana',
            'ME': 'Maine',
            'MD': 'Maryland',
            'MA': 'Massachusetts',
            'MI': 'Michigan',
            'MN': 'Minnesota',
            'MS': 'Mississippi',
            'MO': 'Missouri',
            'MT': 'Montana',
            'NE': 'Nebraska',
            'NV': 'Nevada',
            'NH': 'New Hampshire',
            'NJ': 'New Jersey',
            'NM': 'New Mexico',
            'NY': 'New York',
            'NC': 'North Carolina',
            'ND': 'North Dakota',
            'OH': 'Ohio',
            'OK': 'Oklahoma',
            'OR': 'Oregon',
            'PA': 'Pennsylvania',
            'RI': 'Rhode Island',
            'SC': 'South Carolina',
            'SD': 'South Dakota',
            'TN': 'Tennessee',
            'TX': 'Texas',
            'UT': 'Utah',
            'VT': 'Vermont',
            'VA': 'Virginia',
            'WA': 'Washington',
            'WV': 'West Virginia',
            'WI': 'Wisconsin',
            'WY': 'Wyoming',
            'DC': 'District of Columbia'
        };
        
        return stateMap[stateCode] || stateCode;
    }
    
    // Load state-level data with stores and sellers
    async function loadStateData(stateName, metricType = 'total_gmv') {
        showLoading(`Loading data for ${stateName}...`);
        
        try {
            console.log(`HomeJS: Loading data for state: ${stateName}`);
            
            // First, try to get cities data as fallback
            const citiesResponse = await fetch(`/api/cities-gmv/${encodeURIComponent(stateName)}`);
            let citiesData = [];
            
            if (citiesResponse.ok) {
                citiesData = await citiesResponse.json();
                console.log(`HomeJS: Received ${citiesData.length} cities from API for ${stateName}`);
                
                // Store in app state
                appState.currentCitiesData = citiesData;
            }
            
            // Update UI before rendering map
            updateStateView(stateName, citiesData);
            
            // Render map with stores and sellers
            mapManager.renderStateMap(stateName, citiesData, metricType);
            
            hideLoading();
        } catch (error) {
            console.error(`Error loading state data for ${stateName}:`, error);
            hideLoading();
            handleApiError(error);
        }
    }
    
    // Load city-level data
    async function loadCityData(cityName, stateName) {
        showLoading(`Loading stores in ${cityName}, ${stateName}...`);
        
        try {
            const response = await fetch(`/api/stores/${encodeURIComponent(cityName)}/${encodeURIComponent(stateName)}`);
            
            if (!response.ok) {
                throw new Error(`Error fetching stores data: ${response.status}`);
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
            console.error(`Error loading city data for ${cityName}, ${stateName}:`, error);
            hideLoading();
            handleApiError(error);
        }
    }
    
    // Load network data
    async function loadNetworkData(cityName, stateName) {
        try {
            const response = await fetch(`/api/network/${encodeURIComponent(cityName)}/${encodeURIComponent(stateName)}`);
            
            if (!response.ok) {
                throw new Error(`Error fetching network data: ${response.status}`);
            }
            
            const networkData = await response.json();
            appState.currentNetworkData = networkData;
            
            // Enable network toggle if data is available
            toggleNetworkBtn.disabled = networkData.length === 0;
            toggleNetworkBtn.classList.remove('hidden');
            
        } catch (error) {
            console.error(`Error loading network data for ${cityName}, ${stateName}:`, error);
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
        
        // Update legend with actual GMV values
        updateGMVLegend(statesData);
    }
    
    // Update GMV legend with actual values
    function updateGMVLegend(statesData) {
        if (!statesData || statesData.length === 0) return;
        
        // Get min and max GMV
        const gmvValues = statesData.map(d => d.total_gmv).filter(v => v > 0);
        if (gmvValues.length === 0) return;
        
        const minGMV = Math.min(...gmvValues);
        const maxGMV = Math.max(...gmvValues);
        
        // Calculate legend tick values using logarithmic scale
        const logMin = Math.log(minGMV > 0 ? minGMV : 1);
        const logMax = Math.log(maxGMV);
        const logRange = logMax - logMin;
        
        const legendMin = document.querySelector('.legend-min');
        const legendMax = document.querySelector('.legend-max');
        
        // Update legend labels
        legendMin.textContent = formatCurrency(minGMV, true);
        legendMax.textContent = formatCurrency(maxGMV, true);
        
        // Create intermediate tick marks if there's a wide range
        if (maxGMV / minGMV > 100) {
            const legendColors = document.querySelector('.legend-colors');
            
            // Clear existing ticks
            const existingTicks = document.querySelectorAll('.legend-tick');
            existingTicks.forEach(tick => tick.remove());
            
            // Create tick container if it doesn't exist
            let tickContainer = document.querySelector('.legend-ticks');
            if (!tickContainer) {
                tickContainer = document.createElement('div');
                tickContainer.className = 'legend-ticks';
                legendColors.parentNode.appendChild(tickContainer);
            }
            
            // Add CSS for ticks if not already present
            if (!document.querySelector('#legend-tick-styles')) {
                const style = document.createElement('style');
                style.id = 'legend-tick-styles';
                style.textContent = `
                    .legend-ticks {
                        position: relative;
                        height: 16px;
                        margin-top: 3px;
                        width: 100%;
                    }
                    .legend-tick {
                        position: absolute;
                        top: 0;
                        transform: translateX(-50%);
                        font-size: 10px;
                        color: var(--text-light);
                    }
                    .legend-tick:before {
                        content: '';
                        display: block;
                        height: 4px;
                        width: 1px;
                        background: var(--text-light);
                        margin: 0 auto 2px;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add intermediate ticks using log scale
            const numTicks = 3; // Number of intermediate ticks
            for (let i = 1; i <= numTicks; i++) {
                const position = i / (numTicks + 1);
                const logTickValue = Math.exp(logMin + (logRange * position));
                
                const tick = document.createElement('div');
                tick.className = 'legend-tick';
                tick.style.left = `${position * 100}%`;
                tick.textContent = formatCurrency(logTickValue, true);
                tickContainer.appendChild(tick);
            }
        }
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
        panelTitle.textContent = `${stateName} Overview`;
        
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
        
        // Show metric selector
        const metricSelector = document.getElementById('metric-selector');
        metricSelector.classList.remove('hidden');
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
        panelTitle.textContent = `${cityName}, ${stateName} Stores`;
        
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
        
        // Hide metric selector
        const metricSelector = document.getElementById('metric-selector');
        metricSelector.classList.add('hidden');
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
        const { region, data, metricType, metricValue, metricName } = e.detail;
        
        // Show hover info
        hoverInfo.classList.remove('hidden');
        hoverTitle.textContent = region;
        
        // Generate hover details HTML
        let detailsHTML = '';
        
        if (mapManager.getCurrentState().level === 'nation') {
            // State hover details
            detailsHTML = `
                <div class="hover-detail-item">
                    <span class="hover-label">Total Stores:</span>
                    <span class="hover-value">${formatNumber(data.store_count)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Total GMV (Last Month):</span>
                    <span class="hover-value">${formatCurrency(data.total_gmv)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Avg GMV Per Store:</span>
                    <span class="hover-value">${formatCurrency(data.store_count > 0 ? data.total_gmv / data.store_count : 0)}</span>
                </div>
            `;
        } else if (mapManager.getCurrentState().level === 'state') {
            // City hover details
            detailsHTML = `
                <div class="hover-detail-item">
                    <span class="hover-label">City:</span>
                    <span class="hover-value">${data.city}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Total Stores:</span>
                    <span class="hover-value">${formatNumber(data.store_count)}</span>
                </div>
                <div class="hover-detail-item">
                    <span class="hover-label">Total GMV (Last Month):</span>
                    <span class="hover-value">${formatCurrency(data.total_gmv)}</span>
                </div>
            `;
            
            // Add the metric being visualized with emphasis
            if (metricName && metricType !== 'total_gmv') {
                detailsHTML += `
                    <div class="hover-detail-item highlight">
                        <span class="hover-label">${metricName}:</span>
                        <span class="hover-value">${
                            metricType === 'store_count' 
                                ? formatNumber(metricValue) 
                                : formatCurrency(metricValue)
                        }</span>
                    </div>
                `;
            }
            
            // Add lifetime metrics if available
            if (data.total_lifetime_gmv) {
                detailsHTML += `
                    <div class="hover-detail-item">
                        <span class="hover-label">Lifetime GMV:</span>
                        <span class="hover-value">${formatCurrency(data.total_lifetime_gmv)}</span>
                    </div>
                `;
            }
            
            if (data.total_lifetime_orders) {
                detailsHTML += `
                    <div class="hover-detail-item">
                        <span class="hover-label">Lifetime Orders:</span>
                        <span class="hover-value">${formatNumber(data.total_lifetime_orders)}</span>
                    </div>
                `;
            }
            
            detailsHTML += `
                <div class="hover-detail-item">
                    <span class="hover-label">Click to see store details</span>
                </div>
            `;
        }
        
        hoverDetails.innerHTML = detailsHTML;
    }
    
    // Handle store hover
    function handleStoreHover(e) {
        const { store } = e.detail;
        
        // Show hover info
        hoverInfo.classList.remove('hidden');
        hoverTitle.textContent = store.STORE_LOCATION_NAME || `Store #${store.STORE_ID}`;
        
        // Generate hover details HTML with enhanced information
        const detailsHTML = `
            <div class="hover-detail-item">
                <span class="hover-label">Address:</span>
                <span class="hover-value">${store.STORE_ADDRESS || 'N/A'}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">GMV (Last Month):</span>
                <span class="hover-value">${formatCurrency(store.GMV_LAST_MONTH || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">GMV (Month-to-Date):</span>
                <span class="hover-value">${formatCurrency(store.GMV_CURRENT_MONTH || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Lifetime GMV:</span>
                <span class="hover-value">${formatCurrency(store.STORE_LIFETIME_GMV || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Lifetime Orders:</span>
                <span class="hover-value">${formatNumber(store.STORE_LIFETIME_ORDERS || 0)}</span>
            </div>
            ${store.SELLER_FULL_NAME ? `
                <div class="hover-detail-item highlight">
                    <span class="hover-label">Seller:</span>
                    <span class="hover-value">${store.SELLER_FULL_NAME}</span>
                </div>
            ` : ''}
        `;
        
        hoverDetails.innerHTML = detailsHTML;
    }
    
    // Handle seller hover
    function handleSellerHover(e) {
        const { seller } = e.detail;
        
        // Show hover info
        hoverInfo.classList.remove('hidden');
        hoverTitle.textContent = seller.fullName || `Seller #${seller.id}`;
        
        // Generate hover details HTML
        const detailsHTML = `
            <div class="hover-detail-item highlight">
                <span class="hover-label">Seller Location</span>
                <span class="hover-value"><i class="fas fa-map-marker"></i></span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">GMV (Last Month):</span>
                <span class="hover-value">${formatCurrency(seller.gmvLastMonth || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">GMV (Month-to-Date):</span>
                <span class="hover-value">${formatCurrency(seller.gmvMTD || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Lifetime GMV:</span>
                <span class="hover-value">${formatCurrency(seller.lifetimeGMV || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Stores (Last Month):</span>
                <span class="hover-value">${formatNumber(seller.storesLastMonth || 0)}</span>
            </div>
            <div class="hover-detail-item">
                <span class="hover-label">Orders (Month-to-Date):</span>
                <span class="hover-value">${formatNumber(seller.ordersMTD || 0)}</span>
            </div>
        `;
        
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
});