// Mapping of states to their DMAs
// Format: { STATE_CODE: [array of DMAs in that state] }

export const stateDMAMapping = {
  // Alabama
  'AL': [
    'BIRMINGHAM (ANN & TUSC)',
    'MONTGOMERY (SELMA)',
    'MOBILE - PENSACOLA (FT WALT)',
    'HUNTSVILLE - DECATUR (FLOR)',
    'DOTHAN',
    'COLUMBUS, GA',  // Overlaps into AL
    'MERIDIAN',      // Overlaps into AL
    'GREENWOOD - GREENVILLE' // Overlaps into AL
  ],
  
  // Alaska
  'AK': [
    'ANCHORAGE',     // Not in list but the major DMA
    'JUNEAU',        // Not in list but should be included
    'FAIRBANKS'      // Not in list but should be included
  ],
  
  // Arizona
  'AZ': [
    'PHOENIX (PRESCOTT)',
    'TUCSON (SIERRA VISTA)',
    'YUMA - EL CENTRO',
    'FLAGSTAFF'      // Not in list but should be included
  ],
  
  // Arkansas
  'AR': [
    'LITTLE ROCK - PINE BLUFF',
    'FT. SMITH - FAY - SPRNGDL - RGRS',
    'JONESBORO',
    'MONROE - EL DORADO',  // Overlaps into AR
    'SHREVEPORT',          // Overlaps into AR
    'MEMPHIS'              // Overlaps into AR
  ],
  
  // California
  'CA': [
    'LOS ANGELES',
    'SAN FRANCISCO - OAK - SAN JOSE',
    'SAN DIEGO',
    'SACRAMENTO - STKTN - MODESTO',
    'FRESNO - VISALIA',
    'BAKERSFIELD',
    'PALM SPRINGS',
    'MONTEREY - SALINAS',
    'SANTA BARBARA - SANMAR - SANLUOB',
    'CHICO - REDDING',
    'EUREKA',
    'YUMA - EL CENTRO'   // Overlaps into CA
  ],
  
  // Colorado
  'CO': [
    'DENVER',
    'COLORADO SPRINGS - PUEBLO',
    'GRAND JUNCTION - MONTROSE'
  ],
  
  // Connecticut
  'CT': [
    'HARTFORD & NEW HAVEN',
    'BOSTON (MANCHESTER)',   // Overlaps into CT
    'NEW YORK'               // Overlaps into CT
  ],
  
  // Delaware
  'DE': [
    'PHILADELPHIA',         // Overlaps into DE
    'SALISBURY'             // Overlaps into DE
  ],
  
  // Florida
  'FL': [
    'MIAMI - FT. LAUDERDALE',
    'TAMPA - ST. PETE (SARASOTA)',
    'ORLANDO - DAYTONA BCH - MELBRN',
    'WEST PALM BEACH - FT. PIERCE',
    'JACKSONVILLE',
    'FT. MYERS - NAPLES',
    'MOBILE - PENSACOLA (FT WALT)',  // Overlaps into FL
    'TALLAHASSEE - THOMASVILLE',
    'GAINESVILLE',
    'PANAMA CITY'
  ],
  
  // Georgia
  'GA': [
    'ATLANTA',
    'SAVANNAH',
    'MACON',
    'COLUMBUS, GA',
    'ALBANY, GA',
    'AUGUSTA',
    'TALLAHASSEE - THOMASVILLE',  // Overlaps into GA
    'CHATTANOOGA',                // Overlaps into GA
    'JACKSONVILLE',               // Overlaps into GA
    'GREENVILLE - N. BERN - WASHNGTN'  // Overlaps into GA
  ],
  
  // Hawaii
  'HI': [
    'HONOLULU'    // Not in list but the major DMA
  ],
  
  // Idaho
  'ID': [
    'BOISE',
    'IDAHO FALLS - POCATELLO',
    'TWIN FALLS',
    'SPOKANE',       // Overlaps into ID
    'SALT LAKE CITY' // Overlaps into ID
  ],
  
  // Illinois
  'IL': [
    'CHICAGO',
    'CHAMPAIGN & SPRNGFLD - DECATUR',
    'PEORIA - BLOOMINGTON',
    'ROCKFORD',
    'DAVENPORT - R. ISLAND - MOLINE',  // Overlaps into IL
    'ST. LOUIS',                       // Overlaps into IL 
    'PADUCAH - CAPE GIRAR D - HARSBG', // Overlaps into IL
    'QUINCY - HANNIBAL - KEOKUK'       // Overlaps into IL
  ],
  
  // Indiana
  'IN': [
    'INDIANAPOLIS',
    'CHICAGO',               // Overlaps into IN
    'FORT WAYNE',
    'SOUTH BEND - ELKHART',
    'TERRE HAUTE',
    'LOUISVILLE',            // Overlaps into IN
    'EVANSVILLE',
    'LAFAYETTE, IN',
    'CINCINNATI'             // Overlaps into IN
  ],
  
  // Iowa
  'IA': [
    'DES MOINES - AMES',
    'CEDAR RAPIDS - WTRLO - IWC&DUB',
    'DAVENPORT - R. ISLAND - MOLINE',
    'SIOUX CITY',
    'OMAHA',                           // Overlaps into IA
    'OTTUMWA - KIRKSVILLE',
    'ROCHESTER - MASON CITY - AUSTIN', // Overlaps into IA
    'SIOUX FALLS (MITCHELL)',          // Overlaps into IA
    'QUINCY - HANNIBAL - KEOKUK'       // Overlaps into IA
  ],
  
  // Kansas
  'KS': [
    'KANSAS CITY',
    'WICHITA - HUTCHINSON PLUS',
    'TOPEKA',
    'JOPLIN - PITTSBURG'      // Overlaps into KS
  ],
  
  // Kentucky
  'KY': [
    'LOUISVILLE',
    'LEXINGTON',
    'CINCINNATI',              // Overlaps into KY
    'NASHVILLE',               // Overlaps into KY
    'BOWLING GREEN',
    'CHARLESTON - HUNTINGTON', // Overlaps into KY
    'PADUCAH - CAPE GIRAR D - HARSBG', // Overlaps into KY
    'KNOXVILLE',               // Overlaps into KY
    'TRI - CITIES, TN - VA'    // Overlaps into KY
  ],
  
  // Louisiana
  'LA': [
    'NEW ORLEANS',
    'SHREVEPORT',
    'BATON ROUGE',
    'LAFAYETTE, LA',
    'LAKE CHARLES',
    'MONROE - EL DORADO',
    'ALEXANDRIA, LA'
  ],
  
  // Maine
  'ME': [
    'PORTLAND - AUBURN',
    'BANGOR',
    'PRESQUE ISLE',
    'BOSTON (MANCHESTER)' // Overlaps into ME
  ],
  
  // Maryland
  'MD': [
    'BALTIMORE',
    'WASHINGTON, DC (HAGRSTWN)',
    'SALISBURY'
  ],
  
  // Massachusetts
  'MA': [
    'BOSTON (MANCHESTER)',
    'PROVIDENCE - NEW BEDFORD',   // Overlaps into MA
    'SPRINGFIELD - HOLYOKE',
    'ALBANY - SCHENECTADY - TROY' // Overlaps into MA
  ],
  
  // Michigan
  'MI': [
    'DETROIT',
    'GRAND RAPIDS - KALMZOO - B. CRK',
    'FLINT - SAGINAW - BAY CITY',
    'TRAVERSE CITY - CADILLAC',
    'LANSING',
    'MARQUETTE',
    'ALPENA'
  ],
  
  // Minnesota
  'MN': [
    'MINNEAPOLIS - ST. PAUL',
    'DULUTH - SUPERIOR',
    'MANKATO',
    'ROCHESTER - MASON CITY - AUSTIN',
    'FARGO - VALLEY CITY', // Overlaps into MN
    'LA CROSSE - EAU CLAIRE' // Overlaps into MN
  ],
  
  // Mississippi
  'MS': [
    'JACKSON, MS',
    'GREENWOOD - GREENVILLE',
    'COLUMBUS - TUPELO - WEST POINT',
    'HATTIESBURG - LAUREL',
    'BILOXI - GULFPORT',
    'MERIDIAN',
    'MEMPHIS'             // Overlaps into MS
  ],
  
  // Missouri
  'MO': [
    'ST. LOUIS',
    'KANSAS CITY',
    'SPRINGFIELD, MO',
    'COLUMBIA - JEFFERSON CITY',
    'JOPLIN - PITTSBURG',
    'PADUCAH - CAPE GIRAR D - HARSBG',
    'QUINCY - HANNIBAL - KEOKUK',
    'OTTUMWA - KIRKSVILLE',
    'ST. JOSEPH'
  ],
  
  // Montana
  'MT': [
    'BILLINGS',
    'MISSOULA',
    'GREAT FALLS',
    'BUTTE - BOZEMAN',
    'HELENA'
  ],
  
  // Nebraska
  'NE': [
    'OMAHA',
    'LINCOLN & HSTNGS - KRNY',
    'NORTH PLATTE',
    'CHEYENNE - SCOTTSBLUF',
    'SIOUX CITY', // Overlaps into NE
    'SIOUX FALLS (MITCHELL)' // Overlaps into NE
  ],
  
  // Nevada
  'NV': [
    'LAS VEGAS',
    'RENO',
    'SALT LAKE CITY' // Overlaps into NV
  ],
  
  // New Hampshire
  'NH': [
    'BOSTON (MANCHESTER)',
    'PORTLAND - AUBURN',    // Overlaps into NH
    'BURLINGTON - PLATTSBRG' // Overlaps into NH
  ],
  
  // New Jersey
  'NJ': [
    'NEW YORK',           // Overlaps into NJ
    'PHILADELPHIA'        // Overlaps into NJ
  ],
  
  // New Mexico
  'NM': [
    'ALBUQUERQUE - SANTA FE',
    'EL PASO (LAS CRUCES)',
    'AMARILLO'                // Overlaps into NM
  ],
  
  // New York
  'NY': [
    'NEW YORK',
    'BUFFALO',
    'ROCHESTER, NY',
    'ALBANY - SCHENECTADY - TROY',
    'SYRACUSE',
    'BINGHAMTON',
    'UTICA',
    'WATERTOWN',
    'ELMIRA (CORNING)',
    'BURLINGTON - PLATTSBRG'  // Overlaps into NY
  ],
  
  // North Carolina
  'NC': [
    'CHARLOTTE',
    'RALEIGH - DURHAM (FAYETVLLE)',
    'GREENSBORO - H. POINT - W. SALEM',
    'GREENVILLE - N. BERN - WASHNGTN',
    'WILMINGTON',
    'GREENVILLE - SPART - ASHEVLL - ANDM',
    'MYRTLE BEACH - FLORENCE'
  ],
  
  // North Dakota
  'ND': [
    'FARGO - VALLEY CITY',
    'MINOT - BISMARCK - DICKINSON'
  ],
  
  // Ohio
  'OH': [
    'CLEVELAND - AKRON (CANTON)',
    'COLUMBUS, OH',
    'CINCINNATI',
    'DAYTON',
    'TOLEDO',
    'YOUNGSTOWN',
    'LIMA',
    'ZANESVILLE',
    'WHEELING - STEUBENVILLE',
    'PARKERSBURG'
  ],
  
  // Oklahoma
  'OK': [
    'OKLAHOMA CITY',
    'TULSA',
    'WICHITA FALLS & LAWTON',
    'SHERMAN - ADA',
    'AMARILLO',          // Overlaps into OK
    'FT. SMITH - FAY - SPRNGDL - RGRS' // Overlaps into OK
  ],
  
  // Oregon
  'OR': [
    'PORTLAND, OR',
    'EUGENE',
    'BEND, OR',
    'MEDFORD - KLAMATH FALLS'
  ],
  
  // Pennsylvania
  'PA': [
    'PHILADELPHIA',
    'PITTSBURGH',
    'HARRISBURG - LNCSTR - LEB - YORK',
    'WILKES BARRE - SCRANTON',
    'ERIE',
    'JOHNSTOWN - ALTOONA',
    'CLEVELAND - AKRON (CANTON)', // Overlaps into PA
    'YOUNGSTOWN',                 // Overlaps into PA
    'WHEELING - STEUBENVILLE'     // Overlaps into PA
  ],
  
  // Rhode Island
  'RI': [
    'PROVIDENCE - NEW BEDFORD',
    'BOSTON (MANCHESTER)'      // Overlaps into RI
  ],
  
  // South Carolina
  'SC': [
    'CHARLOTTE',               // Overlaps into SC
    'COLUMBIA, SC',
    'CHARLESTON, SC',
    'GREENVILLE - SPART - ASHEVLL - ANDM',
    'MYRTLE BEACH - FLORENCE',
    'AUGUSTA',                  // Overlaps into SC
    'SAVANNAH'                  // Overlaps into SC
  ],
  
  // South Dakota
  'SD': [
    'SIOUX FALLS (MITCHELL)',
    'RAPID CITY',
    'MINOT - BISMARCK - DICKINSON'  // Overlaps into SD
  ],
  
  // Tennessee
  'TN': [
    'NASHVILLE',
    'MEMPHIS',
    'KNOXVILLE',
    'CHATTANOOGA',
    'TRI - CITIES, TN - VA',
    'JACKSON, TN'
  ],
  
  // Texas
  'TX': [
    'DALLAS - FT. WORTH',
    'HOUSTON',
    'SAN ANTONIO',
    'AUSTIN',
    'HARLINGEN - WSLCO - BRNSVL - MCA',
    'EL PASO (LAS CRUCES)',
    'WACO - TEMPLE - BRYAN',
    'CORPUS CHRISTI',
    'AMARILLO',
    'LUBBOCK',
    'TYLER - LONGVIEW (LFKN & NCGD)',
    'WICHITA FALLS & LAWTON',
    'ODESSA - MIDLAND',
    'BEAUMONT - PORT ARTHUR',
    'ABILENE - SWEETWATER',
    'SAN ANGELO',
    'LAREDO',
    'SHERMAN - ADA',
    'VICTORIA',
    'SHREVEPORT'    // Overlaps into TX
  ],
  
  // Utah
  'UT': [
    'SALT LAKE CITY'
  ],
  
  // Vermont
  'VT': [
    'BURLINGTON - PLATTSBRG',
    'BOSTON (MANCHESTER)',     // Overlaps into VT
    'ALBANY - SCHENECTADY - TROY'  // Overlaps into VT
  ],
  
  // Virginia
  'VA': [
    'WASHINGTON, DC (HAGRSTWN)',
    'NORFOLK - PORTSMTH - NEWPT NWS',
    'RICHMOND - PETERSBURG',
    'ROANOKE - LYNCHBURG',
    'TRI - CITIES, TN - VA',
    'CHARLOTTESVILLE',
    'HARRISONBURG',
    'BLUEFIELD - BECKLEY - OAK HILL'  // Overlaps into VA
  ],
  
  // Washington
  'WA': [
    'SEATTLE - TACOMA',
    'SPOKANE',
    'YAKIMA - PASCO - RCHLND - KNNWCK',
    'PORTLAND, OR'   // Overlaps into WA
  ],
  
  // West Virginia
  'WV': [
    'CHARLESTON - HUNTINGTON',
    'WHEELING - STEUBENVILLE',
    'PITTSBURGH',             // Overlaps into WV
    'BLUEFIELD - BECKLEY - OAK HILL',
    'CLARKSBURG - WESTON',
    'PARKERSBURG',
    'WASHINGTON, DC (HAGRSTWN)'  // Overlaps into WV
  ],
  
  // Wisconsin
  'WI': [
    'MILWAUKEE',
    'GREEN BAY - APPLETON',
    'MADISON',
    'LA CROSSE - EAU CLAIRE',
    'WAUSAU - RHINELANDER',
    'DULUTH - SUPERIOR',       // Overlaps into WI
    'MINNEAPOLIS - ST. PAUL'   // Overlaps into WI
  ],
  
  // Wyoming
  'WY': [
    'DENVER',                  // Overlaps into WY
    'CASPER - RIVERTON',
    'CHEYENNE - SCOTTSBLUF',
    'IDAHO FALLS - POCATELLO'  // Overlaps into WY
  ],
  
  // District of Columbia
  'DC': [
    'WASHINGTON, DC (HAGRSTWN)'
  ]
};

// Function to get DMAs for a state
export function getDMAsForState(stateCode) {
  return stateDMAMapping[stateCode.toUpperCase()] || [];
}

// Function to get the state code for a DMA (returns the first matching state)
export function getPrimaryStateForDMA(dmaName) {
  const normalizedDMA = dmaName.toUpperCase();
  
  for (const [state, dmas] of Object.entries(stateDMAMapping)) {
    if (dmas.some(dma => dma.toUpperCase() === normalizedDMA)) {
      return state;
    }
  }
  
  return null;
}

// Function to get all states that a DMA covers
export function getAllStatesForDMA(dmaName) {
  const normalizedDMA = dmaName.toUpperCase();
  const states = [];
  
  for (const [state, dmas] of Object.entries(stateDMAMapping)) {
    if (dmas.some(dma => dma.toUpperCase() === normalizedDMA)) {
      states.push(state);
    }
  }
  
  return states;
}