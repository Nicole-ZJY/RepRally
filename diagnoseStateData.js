// Diagnostic script to check city data for a specific state
// Usage: node diagnoseStateData.js [state_code]
// Example: node diagnoseStateData.js CA

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_CACHE_DIR = path.join(__dirname, 'data_cache');

// Get state code from command line args, default to CA if not provided
const stateCode = process.argv[2] || 'CA';
console.log(`Diagnosing data for state: ${stateCode}`);

async function diagnoseStateData() {
  try {
    // Step 1: Check if data cache directory exists
    console.log('\n1. Checking data cache directory...');
    try {
      await fs.access(DATA_CACHE_DIR);
      console.log('✅ Data cache directory exists.');
    } catch (error) {
      console.log('❌ Data cache directory does not exist. This may indicate the app has never been run.');
      console.log('Creating data cache directory...');
      await fs.mkdir(DATA_CACHE_DIR, { recursive: true });
      console.log('Created data cache directory. Run the app to populate it with data.');
      return;
    }
    
    // Step 2: Check if cached city data exists for the state
    const cacheFilePath = path.join(DATA_CACHE_DIR, `cities_gmv_${stateCode.toLowerCase()}.json`);
    console.log(`\n2. Checking for cached city data at: ${cacheFilePath}`);
    let cachedData;
    
    try {
      await fs.access(cacheFilePath);
      const rawData = await fs.readFile(cacheFilePath, 'utf8');
      
      try {
        cachedData = JSON.parse(rawData);
        console.log(`✅ Found cached data with ${cachedData.length} cities/DMAs.`);
        
        if (cachedData.length === 0) {
          console.log('⚠️ WARNING: The cached data array is empty. No cities/DMAs to display.');
        } else {
          console.log('Sample of cached data:');
          console.log(cachedData[0]);
        }
      } catch (parseError) {
        console.log('❌ ERROR: Found cache file but it contains invalid JSON.');
        console.log(parseError);
        
        // Show a sample of the raw data to help debug
        console.log('First 100 characters of the file:');
        console.log(rawData.substring(0, 100));
      }
    } catch (cacheError) {
      console.log('❌ No cached data found for this state.');
    }
    
    // Step 3: Make a direct API call to test the endpoint
    console.log('\n3. Testing API endpoint by making a direct call...');
    try {
      const response = await fetch(`http://localhost:3000/api/cities-gmv/${stateCode}`);
      
      console.log(`API Response Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const apiData = await response.json();
        
        if (!Array.isArray(apiData)) {
          console.log('❌ API returned data, but it is not an array:');
          console.log(apiData);
          return;
        }
        
        console.log(`✅ API returned ${apiData.length} cities/DMAs.`);
        
        if (apiData.length === 0) {
          console.log('⚠️ WARNING: The API returned an empty array. No cities/DMAs to display.');
        } else {
          console.log('Sample of API data:');
          console.log(apiData[0]);
          
          // Check for required fields
          console.log('\n4. Checking for required fields in API data...');
          const requiredFields = ['city', 'latitude', 'longitude', 'total_gmv', 'store_count'];
          let allFieldsPresent = true;
          
          for (const field of requiredFields) {
            if (apiData[0][field] === undefined) {
              console.log(`❌ Missing required field: ${field}`);
              allFieldsPresent = false;
            }
          }
          
          if (allFieldsPresent) {
            console.log('✅ All required fields are present.');
          }
          
          // Check for valid coordinates
          console.log('\n5. Checking for valid coordinates...');
          const validCoords = apiData.filter(item => 
            item.latitude && 
            item.longitude && 
            !isNaN(item.latitude) && 
            !isNaN(item.longitude)
          );
          
          console.log(`${validCoords.length} out of ${apiData.length} items have valid coordinates.`);
          
          if (validCoords.length === 0) {
            console.log('❌ ERROR: No items have valid coordinates. This will prevent any data from showing on the map.');
          } else if (validCoords.length < apiData.length) {
            console.log('⚠️ WARNING: Some items are missing coordinates and will not show on the map.');
          } else {
            console.log('✅ All items have valid coordinates.');
          }
        }
      }
    } catch (apiError) {
      console.log('❌ Error calling API endpoint:');
      console.log(apiError);
    }
    
    // Step 6: Check if browser console has errors
    console.log('\n6. Final checks and recommendations:');
    console.log('- Check your browser console for JavaScript errors when clicking on the state');
    console.log('- Ensure MapManager.js is correctly loading and processing the data');
    console.log('- Verify that the marker rendering functions are working properly');
    
    console.log('\nDiagnostic complete!');
  } catch (error) {
    console.error('Error during diagnosis:', error);
  }
}

// Run the diagnostic
diagnoseStateData();