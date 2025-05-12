// Utility functions for RepRally HeatMap Center

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
    // Color scale from orange/yellow (lower values) to deep red (higher values)
    const colors = [
        '#ffffcc', // lightest (pale yellow)
        '#ffeda0',
        '#fed976',
        '#feb24c',
        '#fd8d3c',
        '#fc4e2a',
        '#e31a1c',
        '#b10026'  // darkest (deep red)
    ];
    
    // Handle edge cases
    if (min === max) return colors[Math.floor(colors.length / 2)]; // Middle color
    if (value <= min) return colors[0];
    if (value >= max) return colors[colors.length - 1];
    
    // Use logarithmic scaling to better represent the wide range of values
    const logMin = Math.log(min > 0 ? min : 1);
    const logMax = Math.log(max);
    const logValue = Math.log(value > 0 ? value : 1);
    
    // Calculate normalized value with logarithmic scale
    const normalizedValue = (logValue - logMin) / (logMax - logMin);
    
    // Apply power function to emphasize differences
    const adjustedValue = Math.pow(normalizedValue, 0.5); // Square root makes smaller values more visible
    
    // Calculate color index
    const index = Math.min(
        Math.floor(adjustedValue * colors.length),
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
}