// Script to manually fix home.js file
// Run with: node manualFixScript.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixHomeJs() {
  const filePath = path.join(__dirname, 'public', 'js', 'home.js');
  
  try {
    // Read the file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Replace import.meta with window.location
    // This is a common pattern: import.meta.url gives the URL of the module, similar to window.location
    let fixedContent = content.replace(/import\.meta/g, '/* import.meta replaced */ window.location');
    
    // Remove any import statements
    const lines = fixedContent.split('\n');
    const fixedLines = lines.filter(line => !line.trim().startsWith('import '));
    
    // Add comment about modifications
    const commentLines = [
      '// NOTE: This file was automatically modified to be compatible with browser scripts.',
      '// - import.meta was replaced with window.location',
      '// - import statements were removed',
      '// If you need ES module features, consider using a module bundler or setting type="module" on script tags.',
      ''
    ];
    
    fixedContent = [...commentLines, ...fixedLines].join('\n');
    
    // Write the fixed file
    await fs.writeFile(filePath, fixedContent, 'utf8');
    console.log(`Successfully fixed ${filePath}`);
    
  } catch (error) {
    console.error(`Error fixing home.js:`, error);
  }
}

// Run the fix
fixHomeJs()
  .then(() => console.log('Done.'))
  .catch(error => console.error('Error:', error));