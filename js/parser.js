/**
 * DataAI File Parsers and Schema Auto-detection
 * Parses CSV, Excel, JSON, and raw SQL dumps, then automatically infers data types and cardinality.
 */

window.DataParser = {
  /**
   * Parse CSV content using PapaParse (assumes loaded in window)
   * @param {string} csvText 
   * @returns {Promise<Array<Object>>}
   */
  parseCSV: function(csvText) {
    return new Promise((resolve, reject) => {
      if (typeof Papa === 'undefined') {
        reject(new Error("PapaParse library not loaded."));
        return;
      }
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors && results.errors.length > 0 && results.data.length === 0) {
            reject(new Error(results.errors[0].message));
          } else {
            resolve(results.data);
          }
        },
        error: function(err) {
          reject(err);
        }
      });
    });
  },

  /**
   * Parse JSON content
   * @param {string} jsonText 
   * @returns {Array<Object>}
   */
  parseJSON: function(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        return this.sanitizeObjects(parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        // If it's a single object, wrap it
        if (Object.keys(parsed).length > 0) {
          // If object has an array field that is a list of objects, pull that
          for (const key in parsed) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0 && typeof parsed[key][0] === 'object') {
              return this.sanitizeObjects(parsed[key]);
            }
          }
          return this.sanitizeObjects([parsed]);
        }
      }
      throw new Error("JSON structure is not tabular (expected an array of objects).");
    } catch (e) {
      throw new Error("Invalid JSON: " + e.message);
    }
  },

  /**
   * Parse Excel binary string using SheetJS (assumes loaded in window)
   * @param {ArrayBuffer} arrayBuffer 
   * @returns {Array<Object>}
   */
  parseExcel: function(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error("SheetJS (XLSX) library not loaded.");
    }
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    if (workbook.SheetNames.length === 0) {
      throw new Error("Excel workbook contains no sheets.");
    }
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    return this.sanitizeObjects(jsonData);
  },

  /**
   * Parse SQL dump file (.sql) containing INSERT INTO statements.
   * Very useful for quick SQL imports.
   * @param {string} sqlText 
   * @returns {Array<Object>}
   */
  parseSQL: function(sqlText) {
    // Look for INSERT INTO statements
    const lines = sqlText.split(/\r?\n/);
    const rows = [];
    let columns = [];
    let tableName = "dataset";

    // Regex to match: INSERT INTO `table` (`col1`, `col2`) VALUES (val1, val2);
    // Or just INSERT INTO table VALUES (val1, val2);
    const insertRegex = /INSERT\s+INTO\s+[`"'\w]+\s*(?:\(([^)]+)\))?\s*VALUES\s*\((.+)\)/i;
    
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('--') || line.startsWith('/*')) continue;

      const match = line.match(insertRegex);
      if (match) {
        let colsStr = match[1];
        let valsStr = match[2];

        // Process columns if defined
        if (colsStr && columns.length === 0) {
          columns = colsStr.split(',').map(c => c.replace(/[`"'\s]/g, ''));
        }

        // Parse SQL values, keeping string quotes in mind
        // This is a simple SQL value splitter that respects strings with commas
        const values = [];
        let currentVal = "";
        let inString = false;
        let stringChar = "";

        for (let i = 0; i < valsStr.length; i++) {
          const char = valsStr[i];
          if ((char === "'" || char === '"' || char === '`') && (i === 0 || valsStr[i - 1] !== '\\')) {
            if (!inString) {
              inString = true;
              stringChar = char;
            } else if (char === stringChar) {
              inString = false;
            } else {
              currentVal += char;
            }
          } else if (char === ',' && !inString) {
            values.push(currentVal.trim());
            currentVal = "";
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim());

        // Process values into objects
        const row = {};
        const maxLen = Math.max(columns.length, values.length);
        
        for (let i = 0; i < maxLen; i++) {
          let colName = columns[i] || `Column_${i + 1}`;
          let rawVal = values[i];

          if (rawVal === undefined || rawVal.toUpperCase() === 'NULL') {
            row[colName] = null;
          } else {
            // Clean value: remove leading/trailing quotes if any
            if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || 
                (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
              rawVal = rawVal.substring(1, rawVal.length - 1);
            }
            
            // Try to cast to number
            if (!isNaN(rawVal) && rawVal !== "") {
              row[colName] = Number(rawVal);
            } else if (rawVal.toLowerCase() === 'true') {
              row[colName] = true;
            } else if (rawVal.toLowerCase() === 'false') {
              row[colName] = false;
            } else {
              row[colName] = rawVal;
            }
          }
        }
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      throw new Error("No SQL INSERT statements detected. Make sure the file contains standard 'INSERT INTO table (cols) VALUES (vals)' statements.");
    }
    return rows;
  },

  /**
   * Helper to clean up object keys (e.g. remove spaces, dots) and parse numbers
   */
  sanitizeObjects: function(arr) {
    return arr.map(obj => {
      const newObj = {};
      for (let key in obj) {
        // Strip out dots or brackets from keys to prevent issues with path lookups
        const cleanKey = key.replace(/[.\[\]]/g, '_').trim();
        let val = obj[key];
        
        // Auto convert numeric strings
        if (typeof val === 'string' && val.trim() !== '') {
          if (!isNaN(val)) {
            val = Number(val);
          }
        }
        newObj[cleanKey] = val;
      }
      return newObj;
    });
  },

  /**
   * Automatically detect column types, counts, and basic meta info
   * @param {Array<Object>} dataset 
   * @returns {Object} Schema descriptor
   */
  detectSchema: function(dataset) {
    if (!dataset || dataset.length === 0) return {};
    
    // Get all unique keys in dataset
    const allKeys = new Set();
    dataset.forEach(row => {
      Object.keys(row).forEach(k => allKeys.add(k));
    });
    
    const schema = {};
    const totalRows = dataset.length;

    allKeys.forEach(col => {
      let numericCount = 0;
      let dateCount = 0;
      let nullCount = 0;
      const uniqueValues = new Set();

      dataset.forEach(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') {
          nullCount++;
          return;
        }

        uniqueValues.add(val);

        // Check numeric
        if (typeof val === 'number') {
          numericCount++;
        } else if (typeof val === 'string' && !isNaN(val) && val.trim() !== '') {
          numericCount++;
        }

        // Check date
        if (typeof val === 'string' || val instanceof Date) {
          const dateStr = String(val);
          // Standard date format match (e.g. YYYY-MM-DD or MM/DD/YYYY or ISO)
          const isDate = !isNaN(Date.parse(dateStr)) && 
                          (dateStr.includes('-') || dateStr.includes('/') || dateStr.includes('T')) &&
                          dateStr.replace(/[-/T:.\s\d]/g, '').length === 0;
          if (isDate) {
            dateCount++;
          }
        }
      });

      const validCount = totalRows - nullCount;
      const uniqueCount = uniqueValues.size;
      const cardinalityRatio = validCount > 0 ? (uniqueCount / validCount) : 0;

      let inferredType = 'text';
      if (numericCount / validCount > 0.8) {
        inferredType = 'numeric';
      } else if (dateCount / validCount > 0.8) {
        inferredType = 'temporal';
      } else if (uniqueCount < 20 || cardinalityRatio < 0.2) {
        inferredType = 'categorical';
      }

      schema[col] = {
        type: inferredType,
        uniqueCount: uniqueCount,
        nullCount: nullCount,
        missingRate: (nullCount / totalRows) * 100,
        sampleValues: Array.from(uniqueValues).slice(0, 5)
      };
    });

    return schema;
  }
};
