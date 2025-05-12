// RepRally HeatMap Center Backend
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';
import session from 'express-session';
import fs from 'fs/promises';
import cron from 'node-cron';
import bcrypt from 'bcrypt';
import { join, dirname } from 'path';
import { stateDMAMapping, getDMAsForState } from './stateDMAMapping.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
// import debugMiddleware from './debugMiddleware.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database setup for users
const DB_DIR = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_DIR, 'users.json');

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Add a request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


// Helper to get cached state data
async function getCachedStateData() {
  try {
    const cacheFilePath = path.join(DATA_CACHE_DIR, 'states_gmv.json');
    const cachedData = await fs.readFile(cacheFilePath, 'utf8');
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error reading cached state data:', error);
    return null;
  }
}

// Ensure database directory exists
async function ensureDbDir() {
  try {
    await fs.access(DB_DIR);
  } catch (error) {
    await fs.mkdir(DB_DIR, { recursive: true });
    console.log('Created database directory');
  }
}

// Initialize the users.json file if it doesn't exist
async function ensureUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    // Create default users.json file with empty users array
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }), 'utf8');
    console.log('Created users.json file');
  }
}

// Initialize user database
async function initializeUserDb() {
  // Ensure directory and file exist
  await ensureDbDir();
  await ensureUsersFile();
  
  // Create adapter and db instance
  const adapter = new JSONFile(USERS_FILE);
  const db = new Low(adapter, { users: [] }); // Provide default data here
  
  try {
    // Read existing data
    await db.read();
    
    // Create default admin user if no users exist
    if (!db.data.users || db.data.users.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      db.data.users = [{
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      }];
      await db.write();
      console.log('Created default admin user');
    }
    
    return db;
  } catch (error) {
    console.error('Error initializing user database:', error);
    throw error;
  }
}

let usersDb; // Will be initialized at startup

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(debugMiddleware);

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'reprally-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));


// Snowflake connection
let snowflakeConnection = null;

async function connectToSnowflake() {
  return new Promise((resolve, reject) => {
    try {
      console.log('Initializing Snowflake connection...');
      
      // Check if we have a private key path in the environment
      const privateKeyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
      let connectionOptions = {
        account: process.env.SNOWFLAKE_ACCOUNT || 'FEBEOOK-RVB78017',
        username: process.env.SNOWFLAKE_USER || 'NICOLE',
        warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
        database: process.env.SNOWFLAKE_DATABASE || 'REPRALLY',
        schema: process.env.SNOWFLAKE_SCHEMA || 'ANALYTICS',
        role: process.env.SNOWFLAKE_ROLE || 'USERADMIN'
      };

      console.log('Connection configuration:', {
        account: connectionOptions.account,
        username: connectionOptions.username,
        warehouse: connectionOptions.warehouse,
        database: connectionOptions.database,
        schema: connectionOptions.schema,
        role: connectionOptions.role
      });

      // Determine authentication method
      if (privateKeyPath) {
        // Key Pair Authentication
        console.log('Attempting Snowflake connection using key pair authentication');
        console.log('Private key path:', privateKeyPath);
        
        try {
          const privateKey = fs.readFileSync(privateKeyPath.replace('~', process.env.HOME), 'utf8');
          connectionOptions.authenticator = 'SNOWFLAKE_JWT';
          connectionOptions.privateKey = privateKey;
          console.log('Successfully read private key');
        } catch (keyError) {
          console.error('Error reading private key:', keyError);
          console.error('Full error details:', JSON.stringify(keyError, null, 2));
          console.log('Falling back to password authentication');
          // Fall back to password auth if key fails
          connectionOptions.password = process.env.SNOWFLAKE_PASSWORD || 'Zjy.20010628nicole';
        }
      } else {
        // Password Authentication
        console.log('Attempting Snowflake connection using password authentication');
        connectionOptions.password = process.env.SNOWFLAKE_PASSWORD || 'Zjy.20010628nicole';
      }

      // Create connection
      console.log('Creating Snowflake connection object...');
      const connection = snowflake.createConnection(connectionOptions);

      // Add connection test method to the connection object
      connection.testQuery = function() {
        return new Promise((resolveTest, rejectTest) => {
          console.log('Executing test query to verify connection...');
          this.execute({
            sqlText: 'SELECT current_version() as VERSION',
            complete: function(err, stmt, rows) {
              if (err) {
                console.error('Test query failed:', err);
                rejectTest(err);
              } else {
                console.log('Test query successful:', rows);
                resolveTest(rows);
              }
            }
          });
        });
      };

      // Try to connect
      connection.connect((err) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err);
          console.error('Connection error details:', JSON.stringify(err, null, 2));
          console.error('Connection options used:', {
            account: connectionOptions.account,
            username: connectionOptions.username,
            warehouse: connectionOptions.warehouse,
            database: connectionOptions.database,
            schema: connectionOptions.schema,
            role: connectionOptions.role,
            // Omit password for security
            auth_type: privateKeyPath ? 'key_pair' : 'password'
          });
          reject(err);
        } else {
          console.log('Successfully connected to Snowflake!');
          
          // Perform a test query to verify the connection works fully
          connection.testQuery()
            .then(() => {
              console.log('Connection fully verified with test query');
              
              // Add a method to execute queries with better logging
              connection.executeWithLogging = function(query, binds = []) {
                return new Promise((resolveQuery, rejectQuery) => {
                  console.log('Executing query with logging:', query);
                  console.log('Query parameters:', binds);
                  
                  this.execute({
                    sqlText: query,
                    binds: binds,
                    complete: function(err, stmt, rows) {
                      if (err) {
                        console.error('Query execution failed:', err);
                        console.error('Error details:', JSON.stringify(err, null, 2));
                        console.error('Failed SQL:', query);
                        console.error('Binds:', binds);
                        rejectQuery(err);
                      } else {
                        console.log(`Query executed successfully, returned ${rows ? rows.length : 0} rows`);
                        if (rows && rows.length > 0) {
                          console.log('Sample row:', rows[0]);
                        }
                        resolveQuery(rows);
                      }
                    }
                  });
                });
              };
              
              // Verify database objects exist
              console.log('Verifying database objects...');
              connection.executeWithLogging('SHOW TABLES IN ' + connectionOptions.database + '.' + connectionOptions.schema)
                .then(tables => {
                  console.log('Available tables:', tables);
                  resolve(connection);
                })
                .catch(tablesErr => {
                  console.warn('Could not retrieve tables, but connection seems valid:', tablesErr);
                  // Still resolve the connection even if table check fails
                  resolve(connection);
                });
            })
            .catch(testErr => {
              console.error('Test query failed but connection was established:', testErr);
              // Still resolve the connection since it was established
              resolve(connection);
            });
        }
      });
    } catch (error) {
      console.error('Error creating Snowflake connection:', error);
      console.error('Full error stack:', error.stack);
      reject(error);
    }
  });
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.loggedIn) {
    return next();
  }
  res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find user in database
    const user = usersDb.data.users.find(u => u.username === username);
    
    if (!user) {
      return res.redirect('/login?error=invalid');
    }
    
    // Compare password
    const match = await bcrypt.compare(password, user.password);
    
    if (match) {
      req.session.loggedIn = true;
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      res.redirect('/home');
    } else {
      res.redirect('/login?error=invalid');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login?error=invalid');
  }
});

app.get('/register', (req, res) => {
  res.redirect('/login?tab=register');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Check if username already exists
    if (usersDb.data.users.some(u => u.username === username)) {
      return res.redirect('/login?error=exists&tab=register');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate next user ID
    const nextId = usersDb.data.users.length > 0 
      ? Math.max(...usersDb.data.users.map(u => u.id)) + 1 
      : 1;
    
    // Create new user
    const newUser = {
      id: nextId,
      username,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    // Add to database
    usersDb.data.users.push(newUser);
    await usersDb.write();
    
    // Redirect to login with success message
    res.redirect('/login?success=registered');
  } catch (error) {
    console.error('Registration error:', error);
    res.redirect('/login?error=registration&tab=register');
  }
});

app.get('/home', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// User info API
app.get('/api/user/info', requireAuth, (req, res) => {
  res.json({
    username: req.session.username,
    role: req.session.role
  });
});

// API Routes
app.get('/api/states-gmv', async (req, res) => {
  try {
    const query = `
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
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query', err);
          return res.status(500).json({ error: 'Database query failed' });
        }
        
        // Process the data to ensure consistent property names
        const processedData = rows.map(row => ({
          state: row.STATE || row.state,
          store_count: Number(row.STORE_COUNT || row.store_count || 0),
          total_gmv: Number(row.TOTAL_GMV || row.total_gmv || 0)
        }));
        
        return res.json(processedData);
      }
    });
  } catch (error) {
    console.error('Error fetching state GMV data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});


app.get('/api/cities-gmv/:state', async (req, res) => {
  try {
    const { state } = req.params;
    
    const query = `
      SELECT 
        COALESCE(STORE_DMA_NAME, STORE_CITY) as city,
        COUNT(*) as store_count,
        SUM(GMV_LAST_MONTH) as total_gmv,
        AVG(GMV_LAST_MONTH) as avg_gmv_per_store,
        SUM(STORE_LIFETIME_GMV) as total_lifetime_gmv,
        SUM(STORE_LIFETIME_ORDERS) as total_lifetime_orders,
        AVG(LATITUDE) as latitude,
        AVG(LONGITUDE) as longitude
      FROM 
        STORES 
      WHERE 
        STORE_STATE = ?
        AND COALESCE(STORE_DMA_NAME, STORE_CITY) IS NOT NULL
      GROUP BY 
        COALESCE(STORE_DMA_NAME, STORE_CITY)
      ORDER BY 
        total_gmv DESC
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [state],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query', err);
          return res.status(500).json({ error: 'Database query failed' });
        }
        
        // Process the data to ensure consistent property names and filter out entries with no coordinates
        const processedData = (rows || [])
          .map(row => ({
            city: row.CITY || row.city || '',
            store_count: Number(row.STORE_COUNT || row.store_count || 0),
            total_gmv: Number(row.TOTAL_GMV || row.total_gmv || 0),
            avg_gmv_per_store: Number(row.AVG_GMV_PER_STORE || row.avg_gmv_per_store || 0),
            total_lifetime_gmv: Number(row.TOTAL_LIFETIME_GMV || row.total_lifetime_gmv || 0),
            total_lifetime_orders: Number(row.TOTAL_LIFETIME_ORDERS || row.total_lifetime_orders || 0),
            latitude: Number(row.LATITUDE || row.latitude || 0),
            longitude: Number(row.LONGITUDE || row.longitude || 0)
          }))
          .filter(item => item.latitude && item.longitude); // Filter out entries with no coordinates
        
        return res.json(processedData);
      }
    });
  } catch (error) {
    console.error('Error fetching city GMV data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/api/state-stores/:state', async (req, res) => {
  try {
    let { state } = req.params;

    console.log(`API Request: /api/state-stores/${state}`);
    
    // Log Snowflake connection status
    console.log(`Snowflake connection available: ${!!snowflakeConnection}`);
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }

      // Get both state code and full name to try multiple formats
    const stateCode = getStateCodeFromName(state);
    const stateName = getStateNameFromCode(state);

        // Create an array of state formats to try
    const stateFormats = [
      state,                   // Original format
      stateCode,               // State code
      stateName,               // State name
      state.toUpperCase(),     // Uppercase
      state.toLowerCase()      // Lowercase
    ].filter(Boolean);  // Remove null/undefined values

    console.log(`Trying state formats: ${stateFormats.join(', ')}`);
        // Build a query that will try all state formats

    if (stateCode) {
      console.log(`Converted state name "${state}" to state code "${stateCode}"`);
      state = stateCode; // Use the state code for the database query
    } else {
      console.log(`No conversion found for "${state}", using as is`);
    }
    const stateFormatsToTry = [
      state,                      // Original format
      stateCode,                  // Two-letter code (if converted)
      state.toUpperCase(),        // Uppercase
      state.toLowerCase(),        // Lowercase
      getStateNameFromCode(state) // Full name (if state was a code)
    ].filter(Boolean); // Remove null/undefined values
    
    console.log(`[State Stores API] Will try these formats:`, stateFormatsToTry);
    // Check if we have an active Snowflake connection
    if (!snowflakeConnection) {
      console.error('No active Snowflake connection');
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
  

    // Enhanced query to join STORES with ORDERS to get more accurate metrics
    const query = `
      SELECT 
        s.STORE_ID,
        s.SELLER_ID,
        s.LATEST_SELLER_ID,
        s.SELLER_FIRST_NAME,
        s.SELLER_LAST_NAME,
        s.STORE_LOCATION_NAME,
        s.STORE_ADDRESS,
        s.STORE_CITY,
        s.STORE_STATE,
        s.STORE_ZIP_CODE,
        s.LATITUDE,
        s.LONGITUDE,
        s.STORE_LIFETIME_GMV,
        s.STORE_LIFETIME_ORDERS,
        s.GMV_LAST_MONTH,
        s.GMV_CURRENT_MONTH,
        s.ORDERS_LAST_MONTH,
        -- Get additional metrics from ORDERS table
        SUM(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                 AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_GMV ELSE 0 END) as ORDERS_MTD_GMV,
        COUNT(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                   AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_ID ELSE NULL END) as ORDERS_MTD_COUNT
      FROM 
        STORES s
      LEFT JOIN
        ORDERS o ON s.STORE_ID = o.STORE_ID
      WHERE 
        s.STORE_STATE = ?
        AND s.LATITUDE IS NOT NULL
        AND s.LONGITUDE IS NOT NULL
      GROUP BY
        s.STORE_ID, s.SELLER_ID, s.LATEST_SELLER_ID, s.SELLER_FIRST_NAME, s.SELLER_LAST_NAME,
        s.STORE_LOCATION_NAME, s.STORE_ADDRESS, s.STORE_CITY, s.STORE_STATE, s.STORE_ZIP_CODE,
        s.LATITUDE, s.LONGITUDE, s.STORE_LIFETIME_GMV, s.STORE_LIFETIME_ORDERS,
        s.GMV_LAST_MONTH, s.GMV_CURRENT_MONTH, s.ORDERS_LAST_MONTH
      ORDER BY 
        s.GMV_LAST_MONTH DESC
      LIMIT 200
    `;

    console.log(`[State Stores API] Executing query with binds:`, stateFormatsToTry);
        // Log the request
    console.log(`Fetching stores for state: ${state}`);
    const placeholders = stateFormatsToTry.map((_ , i) => `?`).join(' OR s.STORE_STATE = ');
    const modifiedQuery = query.replace('s.STORE_STATE = ?', `(s.STORE_STATE = ${placeholders})`);

    snowflakeConnection.execute({
      sqlText: modifiedQuery,
      binds: stateFormats,
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          console.error('SQL Query:', query);
          console.error('Parameters:', [state]);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No stores found for state ${state}`);
          
          // Try the alternate format (if we used code, try name; if we used name, try code)
          const alternateState = stateCode ? getStateNameFromCode(stateCode) : getStateCodeFromName(state);
          if (alternateState) {
            console.log(`Trying alternate state format: ${alternateState}`);
            
            snowflakeConnection.execute({
              sqlText: query,
              binds: [alternateState],
              complete: function(altErr, altStmt, altRows) {
                if (altErr) {
                  console.error('Failed to execute alternate query:', altErr);
                  return res.status(404).json({ error: 'No stores found for this state' });
                }
                
                if (!altRows || altRows.length === 0) {
                  console.warn(`No stores found for alternate state ${alternateState}`);
                  return res.status(404).json({ error: 'No stores found for this state' });
                }
                
                console.log(`Found ${altRows.length} stores using alternate state format: ${alternateState}`);
                return res.json(altRows);
              }
            });
          } else {
            return res.status(404).json({ error: 'No stores found for this state' });
          }
        } else {
          console.log(`Found ${rows.length} stores for state ${state}`);
          return res.json(rows);
        }
      }
    });
  } catch (error) {
    console.error('Error fetching state stores:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// Helper function to convert state name to state code
function getStateCodeFromName(stateName) {
  if (!stateName) return null;
  
  // Handle case where it's already a code
  if (stateName.length === 2 && stateName === stateName.toUpperCase()) {
    return stateName;
  }
  
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
  
  return stateNameToCode[stateName.toLowerCase()];
}

// Helper function to convert state code to state name
function getStateNameFromCode(stateCode) {
  if (!stateCode) return null;
  
  const stateCodeToName = {
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
  
  return stateCodeToName[stateCode.toUpperCase()];
}


// API route to fetch sellers for a specific state (for state-level map)
app.get('/api/state-sellers/:state', async (req, res) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }
    
    const query = `
      SELECT 
        s.SELLER_ID,
        s.SELLER_FIRST_NAME,
        s.SELLER_LAST_NAME,
        s.SELLER_FULL_NAME,
        s.SELLER_ADDRESS,
        s.SELLER_CITY,
        s.SELLER_STATE,
        s.SELLER_ZIP_CODE,
        s.LATITUDE,
        s.LONGITUDE,
        s.SELLER_TOTAL_GMV,
        s.GMV_LAST_MONTH,
        s.GMV_MTD,
        s.STORES_LAST_MONTH,
        s.ORDERS_MTD,
        -- Get additional metrics from ORDERS table
        COUNT(DISTINCT o.STORE_ID) as ACTIVE_STORES_COUNT,
        SUM(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                 AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_GMV ELSE 0 END) as ORDERS_MTD_GMV,
        COUNT(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                   AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_ID ELSE NULL END) as ORDERS_MTD_COUNT
      FROM 
        SELLERS s
      LEFT JOIN
        ORDERS o ON s.SELLER_ID = o.SELLER_ID
      WHERE 
        s.SELLER_STATE = ?
        AND s.LATITUDE IS NOT NULL
        AND s.LONGITUDE IS NOT NULL
      GROUP BY
        s.SELLER_ID, s.SELLER_FIRST_NAME, s.SELLER_LAST_NAME, s.SELLER_FULL_NAME,
        s.SELLER_ADDRESS, s.SELLER_CITY, s.SELLER_STATE, s.SELLER_ZIP_CODE,
        s.LATITUDE, s.LONGITUDE, s.SELLER_TOTAL_GMV, s.GMV_LAST_MONTH,
        s.GMV_MTD, s.STORES_LAST_MONTH, s.ORDERS_MTD
      ORDER BY 
        s.SELLER_TOTAL_GMV DESC
      LIMIT 100
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [state],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No sellers found for state ${state}`);
          return res.status(404).json({ error: 'No sellers found for this state' });
        }
        
        return res.json(rows);
      }
    });
  } catch (error) {
    console.error('Error fetching state sellers:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// API route to fetch stores for a specific city (for city-level map)
app.get('/api/stores/:city/:state', async (req, res) => {
  try {
    const { city, state } = req.params;
    
    if (!city || !state) {
      return res.status(400).json({ error: 'City and state parameters are required' });
    }
    
    const query = `
      SELECT 
        s.STORE_ID,
        s.STORE_LOCATION_NAME,
        s.STORE_ADDRESS,
        s.STORE_CITY,
        s.STORE_STATE,
        s.STORE_ZIP_CODE,
        s.LATITUDE,
        s.LONGITUDE,
        s.STORE_LIFETIME_GMV,
        s.STORE_LIFETIME_ORDERS,
        s.GMV_LAST_MONTH,
        s.GMV_CURRENT_MONTH,
        s.LATEST_SELLER_ID,
        sel.SELLER_FULL_NAME,
        COUNT(o.ORDER_ID) as total_orders,
        MAX(o.ORDER_CREATED_AT) as last_order_date
      FROM 
        STORES s
      LEFT JOIN
        ORDERS o ON s.STORE_ID = o.STORE_ID
      LEFT JOIN
        SELLERS sel ON s.LATEST_SELLER_ID = sel.SELLER_ID
      WHERE 
        s.STORE_CITY = ?
        AND s.STORE_STATE = ?
        AND s.LATITUDE IS NOT NULL
        AND s.LONGITUDE IS NOT NULL
      GROUP BY
        s.STORE_ID, s.STORE_LOCATION_NAME, s.STORE_ADDRESS, s.STORE_CITY, 
        s.STORE_STATE, s.STORE_ZIP_CODE, s.LATITUDE, s.LONGITUDE, 
        s.STORE_LIFETIME_GMV, s.STORE_LIFETIME_ORDERS, s.GMV_LAST_MONTH, 
        s.GMV_CURRENT_MONTH, s.LATEST_SELLER_ID, sel.SELLER_FULL_NAME
      ORDER BY 
        s.GMV_LAST_MONTH DESC
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [city, state],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No stores found for city ${city}, state ${state}`);
          return res.status(404).json({ error: 'No stores found for this city' });
        }
        
        return res.json(rows);
      }
    });
  } catch (error) {
    console.error('Error fetching city stores:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// API route to fetch network data for a specific city (for network visualization)
app.get('/api/network/:city/:state', async (req, res) => {
  try {
    const { city, state } = req.params;
    
    if (!city || !state) {
      return res.status(400).json({ error: 'City and state parameters are required' });
    }
    
    const query = `
      SELECT 
        s.STORE_ID,
        s.STORE_LOCATION_NAME,
        s.LATITUDE as store_lat,
        s.LONGITUDE as store_lng,
        o.SELLER_ID,
        sel.SELLER_FULL_NAME,
        sel.LATITUDE as seller_lat, 
        sel.LONGITUDE as seller_lng,
        COUNT(DISTINCT o.ORDER_ID) as connection_count,
        SUM(o.ORDER_GMV) as connection_gmv
      FROM 
        STORES s
      JOIN 
        ORDERS o ON s.STORE_ID = o.STORE_ID
      JOIN 
        SELLERS sel ON o.SELLER_ID = sel.SELLER_ID
      WHERE 
        s.STORE_CITY = ? 
        AND s.STORE_STATE = ?
        AND s.LATITUDE IS NOT NULL 
        AND s.LONGITUDE IS NOT NULL
        AND sel.LATITUDE IS NOT NULL 
        AND sel.LONGITUDE IS NOT NULL
      GROUP BY
        s.STORE_ID, s.STORE_LOCATION_NAME, s.LATITUDE, s.LONGITUDE,
        o.SELLER_ID, sel.SELLER_FULL_NAME, sel.LATITUDE, sel.LONGITUDE
      ORDER BY
        connection_gmv DESC
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [city, state],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No network connections found for city ${city}, state ${state}`);
          return res.json([]); // Return empty array instead of error
        }
        
        return res.json(rows);
      }
    });
  } catch (error) {
    console.error('Error fetching network data:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// API route for store details (when clicking on a store)
app.get('/api/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID parameter is required' });
    }
    
    const query = `
      SELECT 
        s.STORE_ID,
        s.STORE_LOCATION_NAME,
        s.STORE_ADDRESS,
        s.STORE_CITY,
        s.STORE_STATE,
        s.STORE_ZIP_CODE,
        s.LATITUDE,
        s.LONGITUDE,
        s.STORE_LIFETIME_GMV,
        s.STORE_LIFETIME_ORDERS,
        s.GMV_LAST_MONTH,
        s.GMV_CURRENT_MONTH,
        s.LATEST_SELLER_ID,
        sel.SELLER_FULL_NAME,
        -- Get order history
        COUNT(o.ORDER_ID) as total_orders,
        MAX(o.ORDER_CREATED_AT) as last_order_date,
        SUM(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                 AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_GMV ELSE 0 END) as current_month_gmv,
        SUM(CASE WHEN DATEDIFF(month, o.ORDER_CREATED_AT, CURRENT_DATE()) = 1 
            THEN o.ORDER_GMV ELSE 0 END) as last_month_gmv,
        SUM(CASE WHEN DATEDIFF(month, o.ORDER_CREATED_AT, CURRENT_DATE()) = 2 
            THEN o.ORDER_GMV ELSE 0 END) as two_months_ago_gmv
      FROM 
        STORES s
      LEFT JOIN
        ORDERS o ON s.STORE_ID = o.STORE_ID
      LEFT JOIN
        SELLERS sel ON s.LATEST_SELLER_ID = sel.SELLER_ID
      WHERE 
        s.STORE_ID = ?
      GROUP BY
        s.STORE_ID, s.STORE_LOCATION_NAME, s.STORE_ADDRESS, s.STORE_CITY, s.STORE_STATE,
        s.STORE_ZIP_CODE, s.LATITUDE, s.LONGITUDE, s.STORE_LIFETIME_GMV, s.STORE_LIFETIME_ORDERS,
        s.GMV_LAST_MONTH, s.GMV_CURRENT_MONTH, s.LATEST_SELLER_ID, sel.SELLER_FULL_NAME
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [storeId],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No store found with ID ${storeId}`);
          return res.status(404).json({ error: 'Store not found' });
        }
        
        return res.json(rows[0]); // Return the first (and should be only) row
      }
    });
  } catch (error) {
    console.error('Error fetching store details:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// API route for seller details (when clicking on a seller)
app.get('/api/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID parameter is required' });
    }
    
    const query = `
      SELECT 
        s.SELLER_ID,
        s.SELLER_FULL_NAME,
        s.SELLER_ADDRESS,
        s.SELLER_CITY,
        s.SELLER_STATE,
        s.SELLER_ZIP_CODE,
        s.LATITUDE,
        s.LONGITUDE,
        s.SELLER_TOTAL_GMV,
        s.GMV_LAST_MONTH,
        s.GMV_MTD,
        s.STORES_LAST_MONTH,
        s.ORDERS_MTD,
        -- Get connected stores
        COUNT(DISTINCT o.STORE_ID) as connected_stores_count,
        -- Get recent sales performance
        SUM(CASE WHEN DATEDIFF(day, o.ORDER_CREATED_AT, CURRENT_DATE()) <= 30 
            THEN o.ORDER_GMV ELSE 0 END) as last_30_days_gmv,
        COUNT(CASE WHEN DATEDIFF(day, o.ORDER_CREATED_AT, CURRENT_DATE()) <= 30 
            THEN o.ORDER_ID ELSE NULL END) as last_30_days_orders
      FROM 
        SELLERS s
      LEFT JOIN
        ORDERS o ON s.SELLER_ID = o.SELLER_ID
      WHERE 
        s.SELLER_ID = ?
      GROUP BY
        s.SELLER_ID, s.SELLER_FULL_NAME, s.SELLER_ADDRESS, s.SELLER_CITY, 
        s.SELLER_STATE, s.SELLER_ZIP_CODE, s.LATITUDE, s.LONGITUDE,
        s.SELLER_TOTAL_GMV, s.GMV_LAST_MONTH, s.GMV_MTD, s.STORES_LAST_MONTH, s.ORDERS_MTD
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [sellerId],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No seller found with ID ${sellerId}`);
          return res.status(404).json({ error: 'Seller not found' });
        }
        
        return res.json(rows[0]); // Return the first (and should be only) row
      }
    });
  } catch (error) {
    console.error('Error fetching seller details:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
});

// Data caching directory
const DATA_CACHE_DIR = path.join(__dirname, 'data_cache');

// Ensure data cache directory exists
async function ensureDataCacheDir() {
  try {
    await fs.access(DATA_CACHE_DIR);
  } catch (error) {
    await fs.mkdir(DATA_CACHE_DIR, { recursive: true });
    console.log('Created data cache directory');
  }
}

// Function to fetch and cache data from Snowflake
async function fetchAndCacheData() {
  console.log(`[${new Date().toISOString()}] Starting data fetch...`);
  
  try {
    await ensureDataCacheDir();
    
    // Fetch states GMV data
    const statesData = await fetchStatesGMVData();
    
    if (!statesData || !Array.isArray(statesData) || statesData.length === 0) {
      console.log('No states data available, skipping city data fetch');
      return;
    }
    
    // For each state, fetch cities GMV data (limit to 5 states to avoid overloading)
    const statesToFetch = statesData.slice(0, 5);
    for (const stateData of statesToFetch) {
      if (stateData && stateData.state) {
        await fetchCitiesGMVData(stateData.state);
      } else {
        console.warn('Invalid state data entry, skipping:', stateData);
      }
    }
    
    console.log(`[${new Date().toISOString()}] Data fetch completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in data fetch:`, error);
  }
}

// Function to fetch states GMV data
function fetchStatesGMVData() {
  return new Promise((resolve, reject) => {
    if (!snowflakeConnection) {
      console.warn('No Snowflake connection available, using mock data');
      const mockData = generateMockStatesData();
      fs.writeFile(
        path.join(DATA_CACHE_DIR, 'states_gmv.json'),
        JSON.stringify(mockData),
        'utf8'
      ).then(() => {
        console.log(`Cached mock data for all states`);
        resolve(mockData);
      }).catch(reject);
      return;
    }

    // Add a log to track query execution
    console.log('Executing Snowflake query for states GMV data...');

    const query = `
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
    `;
    
    // Log the query for debugging
    console.log('Query:', query);
    
    snowflakeConnection.execute({
      sqlText: query,
      complete: async function(err, stmt, rows) {
        if (err) {
          console.error('Failed to fetch states GMV data:', err);
          // If query fails, use mock data
          const mockData = generateMockStatesData();
          try {
            await fs.writeFile(
              path.join(DATA_CACHE_DIR, 'states_gmv.json'),
              JSON.stringify(mockData),
              'utf8'
            );
            console.log(`Cached mock data for all states`);
            resolve(mockData);
          } catch (error) {
            reject(error);
          }
          return;
        }
        
        // Log the actual results
        console.log(`Received ${rows ? rows.length : 0} rows from Snowflake`);
        if (rows && rows.length > 0) {
          console.log('Sample row:', rows[0]);
        }
        
        try {
          // Ensure rows is an array even if null or undefined
          const safeRows = rows || [];
          
          await fs.writeFile(
            path.join(DATA_CACHE_DIR, 'states_gmv.json'),
            JSON.stringify(safeRows),
            'utf8'
          );
          console.log(`Cached ${safeRows.length} states from real Snowflake data`);
          
          // Make sure we're returning valid data
          if (!safeRows || !Array.isArray(safeRows) || safeRows.length === 0) {
            console.warn('No data returned from Snowflake, using mock data instead');
            const mockData = generateMockStatesData();
            resolve(mockData);
          } else {
            resolve(safeRows);
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

// Generate mock states data for testing
function generateMockStatesData() {
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming'
  ];

  return states.map(state => {
    const storeCount = Math.floor(Math.random() * 500) + 10;
    const totalGmv = Math.floor(Math.random() * 10000000) + 100000;
    return {
      state: state,
      store_count: storeCount,
      total_gmv: totalGmv
    };
  });
}

// Function to fetch cities GMV data for a state
function fetchCitiesGMVData(state) {
  return new Promise((resolve, reject) => {
    // Input validation for state parameter
    if (!state || typeof state !== 'string') {
      console.error('Invalid state parameter for fetchCitiesGMVData:', state);
      const mockData = generateMockCitiesData('Unknown');
      fs.writeFile(
        path.join(DATA_CACHE_DIR, `cities_gmv_${state ? state.replace(/\s+/g, '_').toLowerCase() : 'unknown'}.json`),
        JSON.stringify(mockData),
        'utf8'
      ).then(() => {
        console.log(`Cached mock data for cities in unknown state`);
        resolve(mockData);
      }).catch(reject);
      return;
    }

    if (!snowflakeConnection) {
      // If connection doesn't exist, use mock data for testing
      console.warn('No Snowflake connection available, using mock data');
      const mockData = generateMockCitiesData(state);
      fs.writeFile(
        path.join(DATA_CACHE_DIR, `cities_gmv_${state.replace(/\s+/g, '_').toLowerCase()}.json`),
        JSON.stringify(mockData),
        'utf8'
      ).then(() => {
        console.log(`Cached mock data for cities in ${state}`);
        resolve(mockData);
      }).catch(reject);
      return;
    }
    
    // Add a log to track query execution
    console.log(`Executing Snowflake query for cities in ${state}...`);
    
    // Enhanced query to use STORE_DMA_NAME instead of STORE_CITY
    const query = `
      SELECT 
        COALESCE(STORE_DMA_NAME, STORE_CITY) as city,
        COUNT(*) as store_count,
        SUM(GMV_LAST_MONTH) as total_gmv,
        AVG(GMV_LAST_MONTH) as avg_gmv_per_store,
        SUM(STORE_LIFETIME_GMV) as total_lifetime_gmv,
        SUM(STORE_LIFETIME_ORDERS) as total_lifetime_orders,
        AVG(LATITUDE) as latitude,
        AVG(LONGITUDE) as longitude
      FROM 
        STORES 
      WHERE 
        STORE_STATE = '${state}' 
        AND COALESCE(STORE_DMA_NAME, STORE_CITY) IS NOT NULL
      GROUP BY 
        COALESCE(STORE_DMA_NAME, STORE_CITY)
      ORDER BY 
        total_gmv DESC
    `;
    
    // Log the query for debugging
    console.log('Query:', query);
    
    snowflakeConnection.execute({
      sqlText: query,
      complete: async function(err, stmt, rows) {
        if (err) {
          console.error(`Failed to fetch cities GMV data for state ${state}:`, err);
          // If query fails, use mock data
          const mockData = generateMockCitiesData(state);
          try {
            await fs.writeFile(
              path.join(DATA_CACHE_DIR, `cities_gmv_${state.replace(/\s+/g, '_').toLowerCase()}.json`),
              JSON.stringify(mockData),
              'utf8'
            );
            console.log(`Cached mock data for cities in ${state}`);
            resolve(mockData);
          } catch (error) {
            reject(error);
          }
          return;
        }
        
        // Log the actual results
        console.log(`Received ${rows ? rows.length : 0} rows from Snowflake for ${state}`);
        if (rows && rows.length > 0) {
          console.log('Sample row:', rows[0]);
        }
        
        try {
          // Ensure rows is an array even if null or undefined
          const safeRows = rows || [];
          
          // Process the data to ensure consistent property names and filter out entries with no coordinates
          const processedData = safeRows
            .map(row => ({
              city: row.CITY || row.city || '',
              store_count: Number(row.STORE_COUNT || row.store_count || 0),
              total_gmv: Number(row.TOTAL_GMV || row.total_gmv || 0),
              avg_gmv_per_store: Number(row.AVG_GMV_PER_STORE || row.avg_gmv_per_store || 0),
              total_lifetime_gmv: Number(row.TOTAL_LIFETIME_GMV || row.total_lifetime_gmv || 0),
              total_lifetime_orders: Number(row.TOTAL_LIFETIME_ORDERS || row.total_lifetime_orders || 0),
              latitude: Number(row.LATITUDE || row.latitude || 0),
              longitude: Number(row.LONGITUDE || row.longitude || 0)
            }))
            .filter(item => item.latitude && item.longitude); // Filter out entries with no coordinates
          
          await fs.writeFile(
            path.join(DATA_CACHE_DIR, `cities_gmv_${state.replace(/\s+/g, '_').toLowerCase()}.json`),
            JSON.stringify(processedData),
            'utf8'
          );
          console.log(`Cached ${processedData.length} cities from real Snowflake data for ${state}`);
          
          resolve(processedData);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

// Generate mock cities data for testing
function generateMockCitiesData(state) {
  if (!state || typeof state !== 'string') {
    console.error('Invalid state provided to generateMockCitiesData:', state);
    state = 'Unknown';
  }

  // Get state code
  const stateCode = state.length === 2 ? state.toUpperCase() : getStateCode(state);
  
  // Get DMAs for this state from our mapping
  let dmaNames = [];
  if (stateDMAMapping[stateCode]) {
    dmaNames = stateDMAMapping[stateCode];
  } else {
    // Fall back to generic DMA names
    const statePrefix = state.substring(0, 3).toUpperCase();
    dmaNames = [
      `${statePrefix} - CENTRAL`,
      `${statePrefix} - NORTH`,
      `${statePrefix} - SOUTH`,
      `${statePrefix} - EAST`,
      `${statePrefix} - WEST`
    ];
  }

  // Generate some additional generic DMAs if we have too few
  const minDmas = 5;
  if (dmaNames.length < minDmas) {
    const needed = minDmas - dmaNames.length;
    const suffixes = ['AREA', 'REGION', 'METRO', 'ZONE', 'DISTRICT'];
    
    for (let i = 0; i < needed; i++) {
      const suffix = suffixes[i % suffixes.length];
      dmaNames.push(`${state.toUpperCase()} ${suffix} ${i+1}`);
    }
  }
  
  // Generate random but realistic coordinates based on state
  // Basic coordinates for different regions of the US
  const regionCoords = {
    'Northeast': { lat: 41.5, lng: -73 },
    'Southeast': { lat: 33, lng: -84 },
    'Midwest': { lat: 40, lng: -89 },
    'Southwest': { lat: 33, lng: -106 },
    'West': { lat: 38, lng: -120 },
    'Northwest': { lat: 45, lng: -122 }
  };
  
  // Determine which region the state is in
  let region = 'Midwest'; // Default
  
  const northeastStates = ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'];
  const southeastStates = ['DE', 'MD', 'VA', 'WV', 'KY', 'NC', 'SC', 'TN', 'GA', 'FL', 'AL', 'MS', 'LA', 'AR'];
  const midwestStates = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'];
  const southwestStates = ['TX', 'OK', 'NM', 'AZ'];
  const westStates = ['CO', 'WY', 'MT', 'ID', 'UT', 'NV', 'CA'];
  const northwestStates = ['WA', 'OR'];
  
  if (northeastStates.includes(stateCode)) region = 'Northeast';
  else if (southeastStates.includes(stateCode)) region = 'Southeast';
  else if (midwestStates.includes(stateCode)) region = 'Midwest';
  else if (southwestStates.includes(stateCode)) region = 'Southwest';
  else if (westStates.includes(stateCode)) region = 'West';
  else if (northwestStates.includes(stateCode)) region = 'Northwest';
  
  // Base coordinates for this state
  const baseLat = regionCoords[region].lat + (Math.random() * 4 - 2); // Add some randomness
  const baseLng = regionCoords[region].lng + (Math.random() * 4 - 2);
  
  // Generate city data with proper coordinates
  const cities = [];
  for (let i = 0; i < dmaNames.length; i++) {
    // Generate coordinates that are reasonably spaced out
    const angle = (i / dmaNames.length) * 2 * Math.PI;
    const distance = Math.random() * 1.5 + 0.5; // 0.5 to 2 degrees from center
    const latitude = baseLat + distance * Math.cos(angle);
    const longitude = baseLng + distance * Math.sin(angle);
    
    // Generate store count with larger DMAs having more stores
    const importanceFactor = 1 - (i / dmaNames.length); // First DMAs are more important
    const storeCount = Math.floor((Math.random() * 40 + 10) * (importanceFactor * 0.8 + 0.2));
    
    // Generate GMV metrics with some correlation to store count but with variation
    const avgStoreGmv = Math.floor(Math.random() * 40000) + 10000; // $10k-$50k per store
    const totalGmv = storeCount * avgStoreGmv * (0.8 + Math.random() * 0.4); // Some variation
    const avgGmvPerStore = totalGmv / storeCount;
    const totalLifetimeGmv = totalGmv * (Math.random() * 5 + 5); // 5-10x of monthly GMV
    const totalLifetimeOrders = Math.floor(totalLifetimeGmv / (Math.random() * 500 + 500)); // Average order value between $500-1000
    
    cities.push({
      city: dmaNames[i],
      store_count: storeCount,
      total_gmv: totalGmv,
      avg_gmv_per_store: avgGmvPerStore,
      total_lifetime_gmv: totalLifetimeGmv,
      total_lifetime_orders: totalLifetimeOrders,
      latitude,
      longitude
    });
  }
  
  // Sort by total GMV descending
  return cities.sort((a, b) => b.total_gmv - a.total_gmv);
}

// Helper function to get state code from name
function getStateCode(stateName) {
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
  
  return stateNameToCode[stateName.toLowerCase()] || stateName.substring(0, 2).toUpperCase();
}

// Update API endpoints to use cached data when available
app.get('/api/states-gmv', async (req, res) => {
  try {
    console.log('API request received for states-gmv');
    const cacheFilePath = path.join(DATA_CACHE_DIR, 'states_gmv.json');
    
    try {
      // Try to read from cache first
      await fs.access(cacheFilePath);
      const cachedData = await fs.readFile(cacheFilePath, 'utf8');
      const parsedData = JSON.parse(cachedData);
      console.log(`Serving cached states data with ${parsedData.length} entries`);
      
      // Process the data to ensure it has the right format
      const formattedData = formatStatesData(parsedData);
      return res.json(formattedData);
    } catch (cacheError) {
      console.log('Cache miss for states GMV data, fetching data');
      
      try {
        const freshData = await fetchStatesGMVData();
        console.log(`Fetched fresh states data with ${freshData.length} entries`);
        
        // Process the data to ensure it has the right format
        const formattedData = formatStatesData(freshData);
        return res.json(formattedData);
      } catch (fetchError) {
        console.error('Error fetching states data:', fetchError);
        
        // If all else fails, return mock data
        const mockData = generateMockStatesData();
        console.log(`Returning mock states data with ${mockData.length} entries`);
        return res.json(mockData);
      }
    }
  } catch (error) {
    console.error('Error in states-gmv endpoint:', error);
    // Even if there's an error, return some data
    const mockData = generateMockStatesData();
    console.log(`Returning emergency mock states data with ${mockData.length} entries`);
    return res.json(mockData);
  }
});

// Helper function to format states data
function formatStatesData(data) {
  if (!Array.isArray(data)) {
    console.warn('States data is not an array:', data);
    return [];
  }
  
  // Map data to ensure it has the right format with lowercase property names
  return data.map(item => {
    if (!item) return null;
    
    // Some implementations might return uppercase column names from Snowflake
    const state = item.state || item.STATE;
    const storeCount = item.store_count || item.STORE_COUNT;
    const totalGmv = item.total_gmv || item.TOTAL_GMV;
    
    if (!state) {
      console.warn('State name missing in data item:', item);
      return null;
    }
    
    return {
      state: state,
      store_count: Number(storeCount) || 0,
      total_gmv: Number(totalGmv) || 0
    };
  }).filter(Boolean); // Remove null entries
}

app.get('/api/cities-gmv/:state', async (req, res) => {
  try {
    const { state } = req.params;
    console.log(`API Request: /api/cities-gmv/${state}`);
    
    const formattedState = state.replace(/\s+/g, '_').toLowerCase();
    const cacheFilePath = path.join(DATA_CACHE_DIR, `cities_gmv_${formattedState}.json`);
    
    try {
      // Try to read from cache first
      await fs.access(cacheFilePath);
      const cachedData = await fs.readFile(cacheFilePath, 'utf8');
      const parsedData = JSON.parse(cachedData);
      console.log(`Serving cached city data for ${state} with ${parsedData.length} entries`);
      
      // Log coordinates info
      const withCoords = parsedData.filter(item => item && item.latitude && item.longitude);
      console.log(`${withCoords.length} of ${parsedData.length} cities have valid coordinates`);
      
      return res.json(parsedData);
    } catch (cacheError) {
      console.log(`Cache miss for cities GMV data for state ${state}, fetching data`);
      
      try {
        const freshData = await fetchCitiesGMVData(state);
        console.log(`Fetched fresh cities data for ${state} with ${freshData.length} entries`);
        
        // Log coordinates info
        const withCoords = freshData.filter(item => item && item.latitude && item.longitude);
        console.log(`${withCoords.length} of ${freshData.length} cities have valid coordinates`);
        
        return res.json(freshData);
      } catch (fetchError) {
        console.error('Error fetching cities data:', fetchError);
        
        // If all else fails, return mock data
        const mockData = generateMockCitiesData(state);
        console.log(`Returning mock cities data for ${state} with ${mockData.length} entries`);
        return res.json(mockData);
      }
    }
  } catch (error) {
    console.error('Error in cities-gmv endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.use((req, res, next) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler (MUST be the last middleware)
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    // Initialize user database
    usersDb = await initializeUserDb();
    console.log('User database initialized');
    
    // Initial data cache setup
    await ensureDataCacheDir();
    console.log('Data cache directory ready');
    
    // Check if we should use mock data only
    const useMockDataOnly = process.env.MOCK_DATA_ONLY === 'true';
    
    if (useMockDataOnly) {
      console.log('MOCK_DATA_ONLY flag is set to true, skipping Snowflake connection');
    } else {
      // Attempt to connect to Snowflake
      try {
        snowflakeConnection = await connectToSnowflake();
        console.log('Snowflake connection established');
        
        // Perform initial data fetch if connected
        await fetchAndCacheData();
        
        // Schedule hourly data fetch from Snowflake
        cron.schedule('0 * * * *', fetchAndCacheData);
        console.log('Scheduled hourly data fetch from Snowflake');
      } catch (snowflakeError) {
        console.error('Failed to connect to Snowflake:', snowflakeError);
        console.log('Application will run with mock data');
      }
    }
    
    // Generate initial mock data if no Snowflake connection
    if (!snowflakeConnection) {
      await fetchStatesGMVData();
      console.log('Generated initial mock data');
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    console.log('Application will attempt to continue with limited functionality');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing Snowflake connection...');
  snowflakeConnection.destroy(function(err) {
    console.log('Snowflake connection closed.');
    process.exit(err ? 1 : 0);
  });
});

// API route to fetch all sellers in a specific state with ORDERS data
app.get('/api/state-sellers/:state', async (req, res) => {
  try {
    const { state } = req.params;
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }
    
    // Check if we have an active Snowflake connection
    if (!snowflakeConnection) {
      console.error('No active Snowflake connection');
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
    
    // Enhanced query to join SELLERS with ORDERS to get more accurate metrics
    const query = `
      SELECT 
        s.SELLER_ID,
        s.SELLER_FIRST_NAME,
        s.SELLER_LAST_NAME,
        s.SELLER_FULL_NAME,
        s.SELLER_ADDRESS,
        s.SELLER_CITY,
        s.SELLER_STATE,
        s.SELLER_ZIP_CODE,
        s.LATITUDE,
        s.LONGITUDE,
        s.SELLER_TOTAL_GMV,
        s.GMV_LAST_MONTH,
        s.GMV_MTD,
        s.STORES_LAST_MONTH,
        s.ORDERS_MTD,
        -- Get additional metrics from ORDERS table
        COUNT(DISTINCT o.STORE_ID) as ACTIVE_STORES_COUNT,
        SUM(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                 AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_GMV ELSE 0 END) as ORDERS_MTD_GMV,
        COUNT(CASE WHEN MONTH(o.ORDER_CREATED_AT) = MONTH(CURRENT_DATE()) 
                   AND YEAR(o.ORDER_CREATED_AT) = YEAR(CURRENT_DATE()) 
            THEN o.ORDER_ID ELSE NULL END) as ORDERS_MTD_COUNT
      FROM 
        SELLERS s
      LEFT JOIN
        ORDERS o ON s.SELLER_ID = o.SELLER_ID
      WHERE 
        s.SELLER_STATE = ?
        AND s.LATITUDE IS NOT NULL
        AND s.LONGITUDE IS NOT NULL
      GROUP BY
        s.SELLER_ID, s.SELLER_FIRST_NAME, s.SELLER_LAST_NAME, s.SELLER_FULL_NAME,
        s.SELLER_ADDRESS, s.SELLER_CITY, s.SELLER_STATE, s.SELLER_ZIP_CODE,
        s.LATITUDE, s.LONGITUDE, s.SELLER_TOTAL_GMV, s.GMV_LAST_MONTH,
        s.GMV_MTD, s.STORES_LAST_MONTH, s.ORDERS_MTD
      ORDER BY 
        s.SELLER_TOTAL_GMV DESC
      LIMIT 100
    `;
    
    snowflakeConnection.execute({
      sqlText: query,
      binds: [state],
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute query:', err);
          return res.status(500).json({ error: 'Database query failed: ' + err.message });
        }
        
        if (!rows || rows.length === 0) {
          console.warn(`No sellers found for state ${state}`);
          return res.status(404).json({ error: 'No sellers found for this state' });
        }
        
        return res.json(rows);
      }
    });
  } catch (error) {
    console.error('Error fetching state sellers:', error);
  }
});

