// Script to validate Snowflake connection and tables
// Run with: node validateSnowflake.js

import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

// Get connection parameters
const account = process.env.SNOWFLAKE_ACCOUNT || 'FEBEOOK-RVB78017';
const username = process.env.SNOWFLAKE_USER || 'NICOLE';
const password = process.env.SNOWFLAKE_PASSWORD || 'Zjy.20010628nicole';
const warehouse = process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH';
const database = process.env.SNOWFLAKE_DATABASE || 'REPRALLY';
const schema = process.env.SNOWFLAKE_SCHEMA || 'ANALYTICS';
const role = process.env.SNOWFLAKE_ROLE || 'USERADMIN';

// Create connection
const connection = snowflake.createConnection({
  account,
  username,
  password,
  warehouse,
  database,
  schema,
  role
});

// Promisify the connect method
const connectAsync = promisify(connection.connect).bind(connection);

// Function to execute a query
function executeQuery(sqlText) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    });
  });
}

// Main validation function
async function validateSnowflake() {
  try {
    console.log('Connection parameters:');
    console.log('  Account:', account);
    console.log('  Username:', username);
    console.log('  Warehouse:', warehouse);
    console.log('  Database:', database);
    console.log('  Schema:', schema);
    console.log('  Role:', role);
    
    console.log('\nConnecting to Snowflake...');
    await connectAsync();
    console.log('✅ Successfully connected to Snowflake!');
    
    // Verify session parameters
    console.log('\nVerifying session parameters...');
    const sessionResults = await executeQuery(`
      SELECT 
        current_warehouse(),
        current_database(),
        current_schema(),
        current_role()
    `);
    const sessionInfo = sessionResults[0];
    console.log('  Current Warehouse:', sessionInfo[0]);
    console.log('  Current Database:', sessionInfo[1]);
    console.log('  Current Schema:', sessionInfo[2]);
    console.log('  Current Role:', sessionInfo[3]);
    
    // Check if STORES table exists
    console.log('\nVerifying STORES table...');
    try {
      const storesResults = await executeQuery(`
        SELECT
          COUNT(*) as total_rows,
          COUNT(STORE_STATE) as state_count,
          COUNT(STORE_CITY) as city_count,
          COUNT(GMV_LAST_MONTH) as gmv_count,
          COUNT(LATITUDE) as lat_count,
          COUNT(LONGITUDE) as lng_count
        FROM STORES
      `);
      
      console.log('✅ STORES table exists!');
      console.log('  Total rows:', storesResults[0].TOTAL_ROWS);
      console.log('  Rows with state:', storesResults[0].STATE_COUNT);
      console.log('  Rows with city:', storesResults[0].CITY_COUNT);
      console.log('  Rows with GMV:', storesResults[0].GMV_COUNT);
      console.log('  Rows with lat/lng:', storesResults[0].LAT_COUNT, '/', storesResults[0].LNG_COUNT);
      
      // Test the main query used in the app
      console.log('\nTesting the states GMV query...');
      const statesGmvResults = await executeQuery(`
        SELECT 
          STORE_STATE as state,
          COUNT(*) as store_count,
          SUM(GMV_LAST_MONTH) as total_gmv
        FROM 
          STORES 
        WHERE 
          STORE_STATE IS NOT NULL 
          AND GMV_LAST_MONTH > 0
        GROUP BY 
          STORE_STATE
        ORDER BY 
          total_gmv DESC
      `);
      
      console.log('✅ States GMV query executed successfully!');
      console.log('  Number of states returned:', statesGmvResults.length);
      
      if (statesGmvResults.length > 0) {
        console.log('  Sample result:');
        console.log('    State:', statesGmvResults[0].STATE);
        console.log('    Store Count:', statesGmvResults[0].STORE_COUNT);
        console.log('    Total GMV:', statesGmvResults[0].TOTAL_GMV);
      } else {
        console.log('⚠️ No state data returned. Check your data.');
      }
      
      // Test the cities query with a state
      if (statesGmvResults.length > 0) {
        const testState = statesGmvResults[0].STATE;
        console.log(`\nTesting the cities GMV query for state: ${testState}...`);
        
        try {
          const citiesGmvResults = await executeQuery(`
            SELECT 
              STORE_CITY as city,
              COUNT(*) as store_count,
              SUM(GMV_LAST_MONTH) as total_gmv,
              AVG(LATITUDE) as latitude,
              AVG(LONGITUDE) as longitude
            FROM 
              STORES 
            WHERE 
              STORE_STATE = '${testState}'
              AND STORE_CITY IS NOT NULL
              AND GMV_LAST_MONTH > 0
            GROUP BY 
              STORE_CITY
            ORDER BY 
              total_gmv DESC
          `);
          
          console.log('✅ Cities GMV query executed successfully!');
          console.log('  Number of cities returned:', citiesGmvResults.length);
          
          if (citiesGmvResults.length > 0) {
            console.log('  Sample result:');
            console.log('    City:', citiesGmvResults[0].CITY);
            console.log('    Store Count:', citiesGmvResults[0].STORE_COUNT);
            console.log('    Total GMV:', citiesGmvResults[0].TOTAL_GMV);
            console.log('    Coordinates:', citiesGmvResults[0].LATITUDE, ',', citiesGmvResults[0].LONGITUDE);
          } else {
            console.log('⚠️ No city data returned for this state. Check your data.');
          }
        } catch (error) {
          console.error('❌ Error executing cities GMV query:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error accessing STORES table:', error);
    }
    
    // Check if SELLERS table exists
    console.log('\nVerifying SELLERS table...');
    try {
      const sellersResults = await executeQuery(`
        SELECT COUNT(*) as total_rows
        FROM SELLERS
      `);
      
      console.log('✅ SELLERS table exists!');
      console.log('  Total rows:', sellersResults[0].TOTAL_ROWS);
    } catch (error) {
      console.error('❌ Error accessing SELLERS table:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close the connection
    console.log('\nClosing Snowflake connection...');
    connection.destroy(function(err) {
      if (err) {
        console.error('Error closing connection:', err);
      } else {
        console.log('Connection closed.');
      }
      process.exit(0);
    });
  }
}

// Run the validation
validateSnowflake();