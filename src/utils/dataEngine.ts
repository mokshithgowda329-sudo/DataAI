import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Schema, 
  Statistics, 
  Correlations, 
  Anomaly, 
  RegressionResult, 
  ColumnMeta, 
  ColumnStats 
} from '../types';

/**
 * DataAI Engine Utility
 * High-performance, client-side data compilation and analytical engine.
 */
export const DataEngine = {
  /**
   * Parse CSV content using PapaParse
   */
  parseCSV(csvText: string): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, any>>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0 && results.data.length === 0) {
            reject(new Error(results.errors[0].message));
          } else {
            resolve(this.sanitizeObjects(results.data));
          }
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  },

  /**
   * Parse JSON content
   */
  parseJSON(jsonText: string): Record<string, any>[] {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        return this.sanitizeObjects(parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Object.keys(parsed).length > 0) {
          for (const key in parsed) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0 && typeof parsed[key][0] === 'object') {
              return this.sanitizeObjects(parsed[key]);
            }
          }
          return this.sanitizeObjects([parsed]);
        }
      }
      throw new Error("JSON structure is not tabular (expected an array of objects).");
    } catch (e: any) {
      throw new Error("Invalid JSON: " + e.message);
    }
  },

  /**
   * Parse Excel binary array using XLSX
   */
  parseExcel(arrayBuffer: ArrayBuffer): Record<string, any>[] {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    if (workbook.SheetNames.length === 0) {
      throw new Error("Excel workbook contains no sheets.");
    }
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null });
    return this.sanitizeObjects(jsonData);
  },

  /**
   * Parse raw SQL dump INSERT INTO scripts
   */
  parseSQL(sqlText: string): Record<string, any>[] {
    const lines = sqlText.split(/\r?\n/);
    const rows: Record<string, any>[] = [];
    let columns: string[] = [];
    const insertRegex = /INSERT\s+INTO\s+[`"'\w]+\s*(?:\(([^)]+)\))?\s*VALUES\s*\((.+)\)/i;
    
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('--') || line.startsWith('/*')) continue;

      const match = line.match(insertRegex);
      if (match) {
        let colsStr = match[1];
        let valsStr = match[2];

        if (colsStr && columns.length === 0) {
          columns = colsStr.split(',').map(c => c.replace(/[`"'\s]/g, ''));
        }

        const values: string[] = [];
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

        const row: Record<string, any> = {};
        const maxLen = Math.max(columns.length, values.length);
        
        for (let i = 0; i < maxLen; i++) {
          let colName = columns[i] || `Column_${i + 1}`;
          let rawVal = values[i];

          if (rawVal === undefined || rawVal.toUpperCase() === 'NULL') {
            row[colName] = null;
          } else {
            if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || 
                (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
              rawVal = rawVal.substring(1, rawVal.length - 1);
            }
            
            if (!isNaN(rawVal as any) && rawVal !== "") {
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
   * Sanitize object keys and convert strings to numbers where possible
   */
  sanitizeObjects(arr: any[]): Record<string, any>[] {
    return arr.map(obj => {
      const newObj: Record<string, any> = {};
      for (let key in obj) {
        const cleanKey = key.replace(/[.[\]]/g, '_').trim();
        let val = obj[key];
        
        if (typeof val === 'string' && val.trim() !== '') {
          if (!isNaN(val as any)) {
            val = Number(val);
          }
        }
        newObj[cleanKey] = val;
      }
      return newObj;
    });
  },

  /**
   * Auto-detect columns, counts, type schemas
   */
  detectSchema(dataset: Record<string, any>[]): Schema {
    if (!dataset || dataset.length === 0) return {};
    
    const allKeys = new Set<string>();
    dataset.forEach(row => {
      Object.keys(row).forEach(k => allKeys.add(k));
    });
    
    const schema: Schema = {};
    const totalRows = dataset.length;

    allKeys.forEach(col => {
      let numericCount = 0;
      let dateCount = 0;
      let nullCount = 0;
      const uniqueValues = new Set<any>();

      dataset.forEach(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') {
          nullCount++;
          return;
        }

        uniqueValues.add(val);

        if (typeof val === 'number') {
          numericCount++;
        } else if (typeof val === 'string' && !isNaN(val as any) && val.trim() !== '') {
          numericCount++;
        }

        if (typeof val === 'string' || val instanceof Date) {
          const dateStr = String(val);
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

      let inferredType: 'numeric' | 'categorical' | 'temporal' | 'text' = 'text';
      if (numericCount / validCount > 0.8) {
        inferredType = 'numeric';
      } else if (dateCount / validCount > 0.8) {
        inferredType = 'temporal';
      } else if (uniqueCount < 20 || cardinalityRatio < 0.2) {
        inferredType = 'categorical';
      }

      schema[col] = {
        type: inferredType,
        uniqueCount,
        nullCount,
        missingRate: (nullCount / totalRows) * 100,
        sampleValues: Array.from(uniqueValues).slice(0, 5)
      };
    });

    return schema;
  },

  /**
   * Compute comprehensive statistics
   */
  calculateBasicStats(dataset: Record<string, any>[], schema: Schema): Statistics {
    const stats: Statistics = {};

    for (let col in schema) {
      const type = schema[col].type;
      
      if (type === 'numeric') {
        const values = dataset
          .map(row => Number(row[col]))
          .filter(val => val !== null && val !== undefined && !isNaN(val));

        if (values.length === 0) continue;

        values.sort((a, b) => a - b);

        const sum = values.reduce((acc, v) => acc + v, 0);
        const mean = sum / values.length;
        
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
        
        const min = values[0];
        const max = values[values.length - 1];

        const sqDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = sqDiffs.reduce((acc, v) => acc + v, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        stats[col] = {
          type: 'numeric',
          count: values.length,
          sum,
          mean,
          median,
          min,
          max,
          variance,
          stdDev,
          range: max - min
        } as ColumnStats;
      } else if (type === 'categorical' || type === 'text') {
        const frequencies: Record<string, number> = {};
        let validCount = 0;

        dataset.forEach(row => {
          const val = row[col];
          if (val !== null && val !== undefined && val !== '') {
            frequencies[val] = (frequencies[val] || 0) + 1;
            validCount++;
          }
        });

        const sortedFreq = Object.entries(frequencies)
          .map(([key, count]) => ({
            value: key,
            count,
            percentage: (count / validCount) * 100
          }))
          .sort((a, b) => b.count - a.count);

        stats[col] = {
          type,
          count: validCount,
          uniqueCount: sortedFreq.length,
          topCategories: sortedFreq.slice(0, 10),
          mode: sortedFreq.length > 0 ? sortedFreq[0].value : null
        } as ColumnStats;
      } else if (type === 'temporal') {
        const dates = dataset
          .map(row => row[col] ? new Date(row[col]) : null)
          .filter(d => d && !isNaN(d.getTime())) as Date[];

        if (dates.length > 0) {
          dates.sort((a, b) => a.getTime() - b.getTime());
          stats[col] = {
            type: 'temporal',
            count: dates.length,
            minDate: dates[0].toISOString().split('T')[0],
            maxDate: dates[dates.length - 1].toISOString().split('T')[0],
            rangeDays: Math.round((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
          } as ColumnStats;
        }
      }
    }

    return stats;
  },

  /**
   * Calculate Pearson Correlation Matrix
   */
  calculateCorrelations(dataset: Record<string, any>[], schema: Schema): Correlations {
    const numericCols = Object.keys(schema).filter(col => schema[col].type === 'numeric');
    const matrix: Correlations = {};

    numericCols.forEach(colX => {
      matrix[colX] = {};
      numericCols.forEach(colY => {
        if (colX === colY) {
          matrix[colX][colY] = 1;
          return;
        }

        const pairs = dataset
          .map(row => ({
            x: Number(row[colX]),
            y: Number(row[colY])
          }))
          .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x !== null && p.y !== null);

        if (pairs.length < 2) {
          matrix[colX][colY] = null;
          return;
        }

        const n = pairs.length;
        const sumX = pairs.reduce((acc, p) => acc + p.x, 0);
        const sumY = pairs.reduce((acc, p) => acc + p.y, 0);
        const sumXY = pairs.reduce((acc, p) => acc + p.x * p.y, 0);
        const sumX2 = pairs.reduce((acc, p) => acc + p.x * p.x, 0);
        const sumY2 = pairs.reduce((acc, p) => acc + p.y * p.y, 0);

        const num = (n * sumXY) - (sumX * sumY);
        const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

        if (den === 0) {
          matrix[colX][colY] = 0;
        } else {
          matrix[colX][colY] = Number((num / den).toFixed(4));
        }
      });
    });

    return matrix;
  },

  /**
   * Scan dataset to flag statistical outlier anomalies
   */
  detectAnomalies(dataset: Record<string, any>[], schema: Schema, stats: Statistics, threshold = 2.5): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const numericCols = Object.keys(schema).filter(col => schema[col].type === 'numeric');

    numericCols.forEach(col => {
      const colStats = stats[col];
      if (!colStats || colStats.type !== 'numeric' || colStats.stdDev === 0) return;

      dataset.forEach((row, index) => {
        const val = row[col];
        if (val === null || val === undefined || isNaN(val)) return;

        const zScore = (Number(val) - colStats.mean) / colStats.stdDev;
        if (Math.abs(zScore) > threshold) {
          anomalies.push({
            rowIndex: index + 1,
            column: col,
            value: val,
            mean: colStats.mean,
            stdDev: colStats.stdDev,
            zScore: Number(zScore.toFixed(2)),
            row
          });
        }
      });
    });

    return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  },

  /**
   * Fit simple linear regression to predict trends
   */
  fitLinearRegression(dataset: Record<string, any>[], xCol: string, yCol: string, forecastCount = 5): RegressionResult | null {
    const isDate = dataset.some(row => {
      const val = row[xCol];
      return val && isNaN(val) && !isNaN(Date.parse(val));
    });

    let dataPoints = dataset.map((row, idx) => {
      let xVal = row[xCol];
      let yVal = Number(row[yCol]);
      
      let xNum = idx;
      let label = `Pt ${idx + 1}`;

      if (isDate && xVal) {
        const dateObj = new Date(xVal);
        if (!isNaN(dateObj.getTime())) {
          xNum = dateObj.getTime();
          label = xVal;
        }
      } else if (!isNaN(xVal) && xVal !== null) {
        xNum = Number(xVal);
        label = String(xVal);
      }

      return {
        originalX: xVal,
        x: xNum,
        y: yVal,
        label
      };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x !== null && p.y !== null);

    dataPoints.sort((a, b) => a.x - b.x);

    if (dataPoints.length < 2) {
      return null;
    }

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
    const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);

    const mDenominator = (n * sumX2) - (sumX * sumX);
    if (mDenominator === 0) return null;

    const slope = ((n * sumXY) - (sumX * sumY)) / mDenominator;
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    const totalSumSq = dataPoints.reduce((acc, p) => acc + Math.pow(p.y - meanY, 2), 0);
    const residualSumSq = dataPoints.reduce((acc, p) => {
      const predY = slope * p.x + intercept;
      return acc + Math.pow(p.y - predY, 2);
    }, 0);

    const r2 = totalSumSq === 0 ? 1 : 1 - (residualSumSq / totalSumSq);

    const fittedPoints = dataPoints.map(p => ({
      x: p.originalX,
      xNum: p.x,
      actual: p.y,
      predicted: Number((slope * p.x + intercept).toFixed(4)),
      label: p.label
    }));

    const forecastPoints = [];
    if (forecastCount > 0 && dataPoints.length > 1) {
      let xInterval = 1;
      let totalDiff = 0;
      for (let i = 1; i < dataPoints.length; i++) {
        totalDiff += dataPoints[i].x - dataPoints[i - 1].x;
      }
      xInterval = totalDiff / (dataPoints.length - 1);
      if (xInterval === 0) xInterval = 1;

      let lastPoint = dataPoints[dataPoints.length - 1];
      
      for (let i = 1; i <= forecastCount; i++) {
        const nextXNum = lastPoint.x + (i * xInterval);
        const predictedVal = slope * nextXNum + intercept;
        
        let displayX: any = `Fct +${i}`;
        if (isDate) {
          const nextDateObj = new Date(nextXNum);
          displayX = nextDateObj.toISOString().split('T')[0];
        } else if (!isNaN(lastPoint.originalX)) {
          displayX = Number((Number(lastPoint.originalX) + (i * xInterval)).toFixed(2));
        }

        forecastPoints.push({
          x: displayX,
          xNum: nextXNum,
          actual: null,
          predicted: Number(predictedVal.toFixed(4)),
          label: String(displayX) + " (Forecast)"
        });
      }
    }

    return {
      slope: Number(slope.toFixed(6)),
      intercept: Number(intercept.toFixed(6)),
      r2: Number(r2.toFixed(4)),
      isDate,
      fittedPoints,
      forecastPoints
    };
  },

  /**
   * Fully-featured SQL SELECT query compiler in TypeScript
   */
  executeSQLQuery(sqlQuery: string, dataset: Record<string, any>[]): Record<string, any>[] {
    if (!dataset || dataset.length === 0) {
      throw new Error("No active dataset loaded to query.");
    }

    let query = sqlQuery.trim();
    if (query.endsWith(';')) {
      query = query.substring(0, query.length - 1);
    }

    const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+([`"\w\d_]+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;
    const match = query.match(selectRegex);

    if (!match) {
      throw new Error("Invalid SQL syntax. Supported format: SELECT columns FROM table [WHERE conditions] [GROUP BY column] [ORDER BY columns] [LIMIT number]");
    }

    const selectClause = match[1].trim();
    const whereClause = match[3] ? match[3].trim() : null;
    const groupByClause = match[4] ? match[4].trim() : null;
    const orderByClause = match[5] ? match[5].trim() : null;
    const limitClause = match[6] ? parseInt(match[6].trim()) : null;

    const selectItems = this.parseSelectClause(selectClause);

    let filteredData = [...dataset];
    if (whereClause) {
      filteredData = this.applyWhereClause(filteredData, whereClause);
    }

    let results: Record<string, any>[] = [];
    if (groupByClause) {
      const groupCol = this.cleanIdentifier(groupByClause);
      results = this.applyGroupBy(filteredData, groupCol, selectItems);
    } else {
      const hasAggregates = selectItems.some(item => item.isAggregate);
      if (hasAggregates) {
        results = [this.calculateAggregatesSingleRow(filteredData, selectItems)];
      } else {
        results = this.projectColumns(filteredData, selectItems);
      }
    }

    if (orderByClause) {
      results = this.applyOrderBy(results, orderByClause);
    }

    if (limitClause !== null && !isNaN(limitClause)) {
      results = results.slice(0, limitClause);
    }

    return results;
  },

  cleanIdentifier(str: string): string {
    return str.replace(/[`"']/g, '').trim();
  },

  parseSelectClause(selectClause: string): any[] {
    if (selectClause.trim() === '*') {
      return [{ type: 'star', raw: '*', alias: '*' }];
    }

    const rawItems: string[] = [];
    let buffer = "";
    let parenDepth = 0;

    for (let char of selectClause) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === ',' && parenDepth === 0) {
        rawItems.push(buffer.trim());
        buffer = "";
      } else {
        buffer += char;
      }
    }
    if (buffer.trim()) {
      rawItems.push(buffer.trim());
    }

    return rawItems.map(item => {
      const aggMatch = item.match(/^(SUM|AVG|COUNT|MIN|MAX)\((.+?)\)(?:\s+AS\s+([`"\w\d_]+)|(?:\s+([`"\w\d_]+)))?$/i);
      if (aggMatch) {
        const func = aggMatch[1].toUpperCase();
        const col = this.cleanIdentifier(aggMatch[2]);
        const alias = this.cleanIdentifier(aggMatch[3] || aggMatch[4] || `${func}_${col}`);
        return {
          isAggregate: true,
          function: func,
          column: col,
          alias,
          raw: item
        };
      }

      const colMatch = item.match(/^([`"\w\d_\-\s]+)(?:\s+AS\s+([`"\w\d_]+)|(?:\s+([`"\w\d_]+)))?$/i);
      if (colMatch) {
        const col = this.cleanIdentifier(colMatch[1]);
        const alias = this.cleanIdentifier(colMatch[2] || colMatch[3] || col);
        return {
          isAggregate: false,
          column: col,
          alias,
          raw: item
        };
      }

      throw new Error(`Could not parse select item: "${item}"`);
    });
  },

  applyWhereClause(data: Record<string, any>[], whereClause: string): Record<string, any>[] {
    const isOr = whereClause.toUpperCase().includes(' OR ');
    const delimiter = isOr ? /\s+OR\s+/i : /\s+AND\s+/i;
    const condStrings = whereClause.split(delimiter);

    const conditions = condStrings.map(condStr => {
      const match = condStr.match(/^([`"\w\d_\-\s]+)\s*(=|!=|<>|>|<|>=|<=|LIKE|IS\s+NULL|IS\s+NOT\s+NULL)\s*(.+)?$/i);
      if (!match) {
        throw new Error(`Failed to parse WHERE condition: "${condStr}"`);
      }
      
      const col = this.cleanIdentifier(match[1]);
      const op = match[2].toUpperCase().trim();
      let rawVal = match[3] ? match[3].trim() : null;
      let val: any = null;

      if (rawVal) {
        if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || 
            (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
          val = rawVal.substring(1, rawVal.length - 1);
        } else if (!isNaN(rawVal as any) && rawVal !== "") {
          val = Number(rawVal);
        } else {
          val = rawVal;
        }
      }

      return { column: col, operator: op, val };
    });

    return data.filter(row => {
      const matchResults = conditions.map(cond => {
        let rowVal = row[cond.column];
        let condVal = cond.val;

        if (typeof rowVal === 'number' && typeof condVal !== 'number') {
          condVal = Number(condVal);
        }

        switch (cond.operator) {
          case '=':
            return String(rowVal).toLowerCase() === String(condVal).toLowerCase();
          case '!=':
          case '<>':
            return String(rowVal).toLowerCase() !== String(condVal).toLowerCase();
          case '>':
            return rowVal > condVal;
          case '<':
            return rowVal < condVal;
          case '>=':
            return rowVal >= condVal;
          case '<=':
            return rowVal <= condVal;
          case 'LIKE':
            const regexStr = '^' + String(condVal).replace(/%/g, '.*').replace(/_/g, '.') + '$';
            const regex = new RegExp(regexStr, 'i');
            return regex.test(String(rowVal));
          case 'IS NULL':
            return rowVal === null || rowVal === undefined || rowVal === '';
          case 'IS NOT NULL':
            return rowVal !== null && rowVal !== undefined && rowVal !== '';
          default:
            return false;
        }
      });

      if (isOr) {
        return matchResults.some(res => res === true);
      } else {
        return matchResults.every(res => res === true);
      }
    });
  },

  applyGroupBy(data: Record<string, any>[], groupCol: string, selectItems: any[]): Record<string, any>[] {
    const groups: Record<string, Record<string, any>[]> = {};
    
    data.forEach(row => {
      let key = row[groupCol];
      if (key === undefined || key === null) key = 'NULL';
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    return Object.entries(groups).map(([groupVal, rows]) => {
      const projectedRow: Record<string, any> = {};
      
      selectItems.forEach(item => {
        if (item.type === 'star') {
          projectedRow[groupCol] = groupVal;
          return;
        }

        if (item.isAggregate) {
          projectedRow[item.alias] = this.computeAggregate(rows, item.column, item.function);
        } else {
          if (item.column.toLowerCase() === groupCol.toLowerCase()) {
            projectedRow[item.alias] = groupVal === 'NULL' ? null : rows[0][groupCol];
          } else {
            projectedRow[item.alias] = rows[0][item.column];
          }
        }
      });

      return projectedRow;
    });
  },

  calculateAggregatesSingleRow(data: Record<string, any>[], selectItems: any[]): Record<string, any> {
    const projectedRow: Record<string, any> = {};
    selectItems.forEach(item => {
      if (item.type === 'star') {
        throw new Error("Cannot mix SELECT * and aggregate functions without GROUP BY.");
      }
      if (item.isAggregate) {
        projectedRow[item.alias] = this.computeAggregate(data, item.column, item.function);
      } else {
        throw new Error(`Select column "${item.column}" must be aggregated or in a GROUP BY clause.`);
      }
    });
    return projectedRow;
  },

  computeAggregate(rows: Record<string, any>[], col: string, func: string): any {
    const vals = rows
      .map(r => r[col])
      .filter(v => v !== null && v !== undefined && v !== '');

    if (func === 'COUNT') {
      return col === '*' || col === '1' ? rows.length : vals.length;
    }

    if (vals.length === 0) return null;

    const numVals = vals.map(Number).filter(v => !isNaN(v));

    switch (func) {
      case 'SUM':
        return Number(numVals.reduce((acc, v) => acc + v, 0).toFixed(4));
      case 'AVG':
        return numVals.length === 0 ? 0 : Number((numVals.reduce((acc, v) => acc + v, 0) / numVals.length).toFixed(4));
      case 'MIN':
        return numVals.length === 0 ? Math.min(...vals) : Math.min(...numVals);
      case 'MAX':
        return numVals.length === 0 ? Math.max(...vals) : Math.max(...numVals);
      default:
        return null;
    }
  },

  projectColumns(data: Record<string, any>[], selectItems: any[]): Record<string, any>[] {
    if (selectItems[0] && selectItems[0].type === 'star') {
      return data;
    }

    return data.map(row => {
      const projected: Record<string, any> = {};
      selectItems.forEach(item => {
        projected[item.alias] = row[item.column] !== undefined ? row[item.column] : null;
      });
      return projected;
    });
  },

  applyOrderBy(data: Record<string, any>[], orderByClause: string): Record<string, any>[] {
    const parts = orderByClause.split(',');
    const sorts = parts.map(part => {
      const match = part.trim().match(/^([`"\w\d_\-\s]+)(?:\s+(ASC|DESC))?$/i);
      if (!match) {
        throw new Error(`Failed to parse ORDER BY sort: "${part}"`);
      }
      return {
        column: this.cleanIdentifier(match[1]),
        direction: (match[2] || 'ASC').toUpperCase()
      };
    });

    return [...data].sort((a, b) => {
      for (let sort of sorts) {
        let valA = a[sort.column];
        let valB = b[sort.column];

        if (valA === undefined) valA = null;
        if (valB === undefined) valB = null;

        if (valA === valB) continue;
        if (valA === null) return 1;
        if (valB === null) return -1;

        const isNumeric = typeof valA === 'number' && typeof valB === 'number';
        let comparison = 0;

        if (isNumeric) {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }

        return sort.direction === 'DESC' ? -comparison : comparison;
      }
      return 0;
    });
  },

  /**
   * Run local stats intelligence rules
   */
  askLocalAI(query: string, schema: Schema, stats: Statistics, anomalies: Anomaly[], correlations: Correlations): string {
    const q = query.toLowerCase();

    for (let col in schema) {
      const colLower = col.toLowerCase();
      if (q.includes(colLower)) {
        const colStats = stats[col];
        if (colStats) {
          if (q.includes("average") || q.includes("mean") || q.includes("avg")) {
            if (colStats.type === 'numeric') {
              return `📊 **Local AI Analyst:** The average (mean) value for **${col}** is **${this.formatNumber(colStats.mean)}**. The range spans from ${this.formatNumber(colStats.min)} to ${this.formatNumber(colStats.max)}.`;
            }
          }
          if (q.includes("sum") || q.includes("total")) {
            if (colStats.type === 'numeric') {
              return `📊 **Local AI Analyst:** The cumulative total for **${col}** is **${this.formatNumber(colStats.sum || 0)}**.`;
            }
          }
          if (q.includes("median")) {
            if (colStats.type === 'numeric') {
              return `📊 **Local AI Analyst:** The median value for **${col}** is **${this.formatNumber(colStats.median)}**.`;
            }
          }
          if (q.includes("min") || q.includes("lowest") || q.includes("smallest")) {
            if (colStats.type === 'numeric') {
              return `📊 **Local AI Analyst:** The lowest recorded value for **${col}** is **${this.formatNumber(colStats.min)}**.`;
            }
          }
          if (q.includes("max") || q.includes("highest") || q.includes("largest") || q.includes("maximum")) {
            if (colStats.type === 'numeric') {
              return `📊 **Local AI Analyst:** The highest recorded value for **${col}** is **${this.formatNumber(colStats.max)}**.`;
            }
          }
        }
      }
    }

    if (q.includes("anomaly") || q.includes("outlier") || q.includes("abnormal") || q.includes("extreme")) {
      if (anomalies.length === 0) {
        return `✅ **Local AI Analyst:** I scanned all numeric columns and found **no anomalies** (using Z-Score threshold of 2.5). Your dataset looks highly regular.`;
      }
      let resp = `🚨 **Local AI Analyst:** Found **${anomalies.length}** outliers. Here are the top anomalies:\n\n`;
      anomalies.slice(0, 5).forEach(a => {
        resp += `- Row **${a.rowIndex}**: **${a.column}** = **${a.value}** (deviation: **${a.zScore}** standard deviations from mean ${this.formatNumber(a.mean)})\n`;
      });
      return resp;
    }

    if (q.includes("correlation") || q.includes("relation") || q.includes("connect") || q.includes("link")) {
      const topPairs: any[] = [];
      const visited = new Set<string>();
      for (let cX in correlations) {
        for (let cY in correlations[cX]) {
          if (cX === cY) continue;
          const key = [cX, cY].sort().join('-');
          if (visited.has(key)) continue;
          visited.add(key);
          if (correlations[cX][cY] !== null) {
            topPairs.push({ x: cX, y: cY, r: correlations[cX][cY] });
          }
        }
      }
      topPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      if (topPairs.length === 0) {
        return `📊 **Local AI Analyst:** I could not find any correlation patterns. Make sure you have multiple numeric columns loaded.`;
      }
      let resp = `🔗 **Local AI Analyst:** Here are the strongest correlations detected:\n\n`;
      topPairs.slice(0, 3).forEach(pair => {
        resp += `- **${pair.x}** and **${pair.y}**: correlation coefficient **r = ${pair.r}**\n`;
      });
      return resp;
    }

    return `🤖 **Local AI Analyst:** I understand your question, but to perform advanced reasoning, custom cross-tabulations, or write elaborate reports, I need access to Gemini. 
\n💡 **Tip:** Go to **Settings** and save your **Gemini API Key** or ask about the dataset columns directly!
\n*(Currently, I can answer queries like: "average of [column]", "total of [column]", "what are the anomalies", or "show correlations")*`;
  },

  /**
   * Generates a descriptive Markdown narrative report
   */
  generateNarrativeSummary(
    dataset: Record<string, any>[], 
    schema: Schema, 
    stats: Statistics, 
    correlations: Correlations, 
    anomalies: Anomaly[]
  ): string {
    if (!dataset || dataset.length === 0) return "No data available.";

    let summary = `### 📊 DataAI Automated Dataset Brief\n\n`;
    summary += `Your dataset contains **${dataset.length}** records and **${Object.keys(schema).length}** attributes. `;
    
    const types: Record<string, number> = {};
    for (let col in schema) {
      const t = schema[col].type;
      types[t] = (types[t] || 0) + 1;
    }
    const typeStrings = Object.entries(types).map(([type, count]) => `**${count}** ${type}`);
    summary += `We auto-detected: ${typeStrings.join(', ')} fields.\n\n`;

    summary += `#### 🔑 Key Field Insights\n`;
    const numericCols = Object.keys(schema).filter(col => schema[col].type === 'numeric');
    if (numericCols.length > 0) {
      numericCols.slice(0, 3).forEach(col => {
        const s = stats[col] as any;
        if (s) {
          summary += `- **${col}**: Average is **${this.formatNumber(s.mean)}** (ranging from *${this.formatNumber(s.min)}* to *${this.formatNumber(s.max)}*). `;
          if (s.sum > 0) {
            summary += `Cumulative total is **${this.formatNumber(s.sum)}**.\n`;
          } else {
            summary += `\n`;
          }
        }
      });
    }

    const categoricalCols = Object.keys(schema).filter(col => schema[col].type === 'categorical');
    if (categoricalCols.length > 0) {
      categoricalCols.slice(0, 2).forEach(col => {
        const s = stats[col] as any;
        if (s && s.mode) {
          summary += `- **${col}**: Highly concentrated in category "**${s.mode}**" (**${this.formatNumber(s.topCategories[0]?.percentage || 0)}%** of values).\n`;
        }
      });
    }
    summary += `\n`;

    summary += `#### 🔗 Statistical Correlations\n`;
    let correlationPairs: any[] = [];
    const visited = new Set<string>();
    
    for (let colX in correlations) {
      for (let colY in correlations[colX]) {
        if (colX === colY) continue;
        const key = [colX, colY].sort().join('-');
        if (visited.has(key)) continue;
        visited.add(key);

        const r = correlations[colX][colY];
        if (r !== null && Math.abs(r) >= 0.4) {
          correlationPairs.push({ x: colX, y: colY, val: r });
        }
      }
    }

    correlationPairs.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    if (correlationPairs.length > 0) {
      correlationPairs.slice(0, 4).forEach(pair => {
        let desc = "moderate";
        if (Math.abs(pair.val) >= 0.8) desc = "very strong";
        else if (Math.abs(pair.val) >= 0.6) desc = "strong";
        
        const direction = pair.val > 0 ? "positive" : "inverse (negative)";
        summary += `- **${pair.x}** and **${pair.y}** have a **${desc} ${direction}** correlation (r = **${pair.val}**). `;
        if (pair.val > 0) {
          summary += `As ${pair.x} increases, ${pair.y} tends to increase.\n`;
        } else {
          summary += `As ${pair.x} increases, ${pair.y} tends to decrease.\n`;
        }
      });
    } else {
      summary += `- No major linear relationships detected among numeric attributes.\n`;
    }
    summary += `\n`;

    summary += `#### 🚨 Anomaly & Outlier Flags\n`;
    if (anomalies.length > 0) {
      summary += `- Detected **${anomalies.length}** distinct data points exhibiting statistical anomalies (|Z-Score| > 2.5).\n`;
      const groupAnom: Record<string, number> = {};
      anomalies.forEach(a => {
        groupAnom[a.column] = (groupAnom[a.column] || 0) + 1;
      });
      for (let col in groupAnom) {
        summary += `  - **${col}** has **${groupAnom[col]}** outliers. `;
        const maxAnom = anomalies.find(a => a.column === col);
        if (maxAnom) {
          summary += `The most extreme deviation is a value of **${maxAnom.value}** (Z = **${maxAnom.zScore}**).\n`;
        }
      }
    } else {
      summary += `- All values lie within normal standard deviation limits. No anomalies detected.\n`;
    }

    return summary;
  },

  /**
   * Impute missing data fields and clamp anomalies to heal the dataset and restore full 100% integrity.
   */
  cleanAndHealDataset(
    dataset: Record<string, any>[],
    schema: Schema,
    stats: Statistics,
    anomalies: Anomaly[]
  ): Record<string, any>[] {
    // Deep clone dataset rows
    const cleaned = dataset.map(row => ({ ...row }));

    // Extract columns with anomalies
    const outlierRowsByCol: Record<string, Set<number>> = {};
    anomalies.forEach(a => {
      if (!outlierRowsByCol[a.column]) {
        outlierRowsByCol[a.column] = new Set();
      }
      outlierRowsByCol[a.column].add(a.rowIndex);
    });

    cleaned.forEach((row, rIdx) => {
      Object.entries(schema).forEach(([col, meta]) => {
        const val = row[col];

        // 1. Impute NULL/Missing Values
        if (val === null || val === undefined || String(val).trim() === '') {
          const colStat = stats[col];
          if (colStat) {
            if (colStat.type === 'numeric') {
              row[col] = colStat.median !== undefined ? colStat.median : colStat.mean;
            } else if (colStat.type === 'categorical' || colStat.type === 'text') {
              row[col] = colStat.mode || 'Other';
            } else if (colStat.type === 'temporal') {
              row[col] = colStat.minDate || new Date().toISOString().split('T')[0];
            }
          } else {
            row[col] = meta.type === 'numeric' ? 0 : 'Other';
          }
        }

        // 2. Clamp Statistical Outliers to 3 Standard Deviation Boundaries
        if (meta.type === 'numeric' && outlierRowsByCol[col]?.has(rIdx)) {
          const colStat = stats[col] as any;
          if (colStat && typeof colStat.mean === 'number' && typeof colStat.stdDev === 'number') {
            const numVal = Number(row[col]);
            if (!isNaN(numVal)) {
              const lowerBound = colStat.mean - 3 * colStat.stdDev;
              const upperBound = colStat.mean + 3 * colStat.stdDev;
              if (numVal < lowerBound) {
                row[col] = Number(lowerBound.toFixed(3));
              } else if (numVal > upperBound) {
                row[col] = Number(upperBound.toFixed(3));
              }
            }
          }
        }
      });
    });

    return cleaned;
  },

  formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined || isNaN(num)) return "N/A";
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    }
    if (Math.abs(num) >= 1000) {
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return Number(num.toFixed(3)).toString();
  }
};

/**
 * Preloaded Demo Datasets for easy evaluation
 */
export const SampleDatasets = {
  sales: [
    { Date: "2026-06-01", Category: "Electronics", Product: "Quantum Phone", Sales: 1200, Profit: 300, Quantity: 2, Region: "North", Discount: 0.0 },
    { Date: "2026-06-02", Category: "Electronics", Product: "Apex Laptop", Sales: 2500, Profit: 750, Quantity: 1, Region: "North", Discount: 0.1 },
    { Date: "2026-06-03", Category: "Furniture", Product: "Ergo Chair", Sales: 450, Profit: 150, Quantity: 3, Region: "East", Discount: 0.0 },
    { Date: "2026-06-04", Category: "Office Supplies", Product: "Smart Binder", Sales: 80, Profit: 25, Quantity: 5, Region: "East", Discount: 0.0 },
    { Date: "2026-06-05", Category: "Electronics", Product: "Quantum Phone", Sales: 1200, Profit: 300, Quantity: 2, Region: "West", Discount: 0.0 },
    { Date: "2026-06-06", Category: "Furniture", Product: "Glass Desk", Sales: 890, Profit: -50, Quantity: 1, Region: "South", Discount: 0.2 },
    { Date: "2026-06-07", Category: "Electronics", Product: "Soundbar X", Sales: 350, Profit: 90, Quantity: 2, Region: "East", Discount: 0.05 },
    { Date: "2026-06-08", Category: "Office Supplies", Product: "Paper Pack", Sales: 45, Profit: 15, Quantity: 10, Region: "North", Discount: 0.0 },
    { Date: "2026-06-09", Category: "Furniture", Product: "Ergo Chair", Sales: 600, Profit: 200, Quantity: 4, Region: "West", Discount: 0.0 },
    { Date: "2026-06-10", Category: "Electronics", Product: "Apex Laptop", Sales: 2500, Profit: 750, Quantity: 1, Region: "South", Discount: 0.0 },
    { Date: "2026-06-11", Category: "Electronics", Product: "Quantum Phone", Sales: 18000, Profit: -8500, Quantity: 30, Region: "North", Discount: 0.4 },
    { Date: "2026-06-12", Category: "Office Supplies", Product: "Smart Binder", Sales: 160, Profit: 50, Quantity: 10, Region: "West", Discount: 0.0 },
    { Date: "2026-06-13", Category: "Furniture", Product: "Glass Desk", Sales: 890, Profit: 220, Quantity: 1, Region: "North", Discount: 0.0 },
    { Date: "2026-06-14", Category: "Electronics", Product: "Soundbar X", Sales: 175, Profit: 45, Quantity: 1, Region: "South", Discount: 0.0 },
    { Date: "2026-06-15", Category: "Office Supplies", Product: "Gel Pen Set", Sales: 25, Profit: 8, Quantity: 2, Region: "East", Discount: 0.0 },
    { Date: "2026-06-16", Category: "Furniture", Product: "Ergo Chair", Sales: 300, Profit: 100, Quantity: 2, Region: "North", Discount: 0.0 },
    { Date: "2026-06-17", Category: "Electronics", Product: "Quantum Phone", Sales: 2400, Profit: 600, Quantity: 4, Region: "East", Discount: 0.0 },
    { Date: "2026-06-18", Category: "Office Supplies", Product: "Paper Pack", Sales: 90, Profit: 30, Quantity: 20, Region: "South", Discount: 0.0 },
    { Date: "2026-06-19", Category: "Furniture", Product: "Glass Desk", Sales: 1780, Profit: 440, Quantity: 2, Region: "West", Discount: 0.0 },
    { Date: "2026-06-20", Category: "Electronics", Product: "Apex Laptop", Sales: 5000, Profit: 1500, Quantity: 2, Region: "West", Discount: 0.0 },
    { Date: "2026-06-21", Category: "Office Supplies", Product: "Smart Binder", Sales: 240, Profit: 75, Quantity: 15, Region: "North", Discount: 0.0 },
    { Date: "2026-06-22", Category: "Furniture", Product: "Ergo Chair", Sales: 150, Profit: 50, Quantity: 1, Region: "South", Discount: 0.0 },
    { Date: "2026-06-23", Category: "Electronics", Product: "Soundbar X", Sales: 525, Profit: 135, Quantity: 3, Region: "North", Discount: 0.05 },
    { Date: "2026-06-24", Category: "Office Supplies", Product: "Gel Pen Set", Sales: 125, Profit: 40, Quantity: 10, Region: "West", Discount: 0.0 },
    { Date: "2026-06-25", Category: "Electronics", Product: "Quantum Phone", Sales: 1200, Profit: 300, Quantity: 2, Region: "South", Discount: 0.0 },
    { Date: "2026-06-26", Category: "Furniture", Product: "Glass Desk", Sales: 890, Profit: 220, Quantity: 1, Region: "East", Discount: 0.0 },
    { Date: "2026-06-27", Category: "Office Supplies", Product: "Smart Binder", Sales: 80, Profit: 25, Quantity: 5, Region: "South", Discount: 0.0 },
    { Date: "2026-06-28", Category: "Electronics", Product: "Apex Laptop", Sales: 2500, Profit: 750, Quantity: 1, Region: "East", Discount: 0.1 },
    { Date: "2026-06-29", Category: "Furniture", Product: "Ergo Chair", Sales: 450, Profit: 150, Quantity: 3, Region: "North", Discount: 0.0 },
    { Date: "2026-06-30", Category: "Electronics", Product: "Soundbar X", Sales: 700, Profit: 180, Quantity: 4, Region: "West", Discount: 0.0 }
  ],
  health: [
    { Date: "2026-06-15", Steps: 4200, ActiveMinutes: 15, SleepHours: 6.2, CaloriesBurned: 1800, SleepQuality: "Fair" },
    { Date: "2026-06-16", Steps: 5100, ActiveMinutes: 20, SleepHours: 7.0, CaloriesBurned: 1950, SleepQuality: "Good" },
    { Date: "2026-06-17", Steps: 6300, ActiveMinutes: 28, SleepHours: 6.8, CaloriesBurned: 2100, SleepQuality: "Good" },
    { Date: "2026-06-18", Steps: 5900, ActiveMinutes: 25, SleepHours: 7.2, CaloriesBurned: 2050, SleepQuality: "Good" },
    { Date: "2026-06-19", Steps: 8200, ActiveMinutes: 42, SleepHours: 7.5, CaloriesBurned: 2400, SleepQuality: "Excellent" },
    { Date: "2026-06-20", Steps: 9500, ActiveMinutes: 50, SleepHours: 8.0, CaloriesBurned: 2600, SleepQuality: "Excellent" },
    { Date: "2026-06-21", Steps: 10400, ActiveMinutes: 55, SleepHours: 7.8, CaloriesBurned: 2750, SleepQuality: "Excellent" },
    { Date: "2026-06-22", Steps: 600, ActiveMinutes: 2, SleepHours: 4.5, CaloriesBurned: 1200, SleepQuality: "Poor" },
    { Date: "2026-06-23", Steps: 7100, ActiveMinutes: 32, SleepHours: 7.1, CaloriesBurned: 2200, SleepQuality: "Good" },
    { Date: "2026-06-24", Steps: 7800, ActiveMinutes: 35, SleepHours: 7.3, CaloriesBurned: 2300, SleepQuality: "Excellent" },
    { Date: "2026-06-25", Steps: 8100, ActiveMinutes: 38, SleepHours: 6.9, CaloriesBurned: 2350, SleepQuality: "Good" },
    { Date: "2026-06-26", Steps: 9000, ActiveMinutes: 45, SleepHours: 7.4, CaloriesBurned: 2500, SleepQuality: "Excellent" },
    { Date: "2026-06-27", Steps: 10200, ActiveMinutes: 52, SleepHours: 7.9, CaloriesBurned: 2700, SleepQuality: "Excellent" },
    { Date: "2026-06-28", Steps: 11500, ActiveMinutes: 60, SleepHours: 8.2, CaloriesBurned: 2900, SleepQuality: "Excellent" },
    { Date: "2026-06-29", Steps: 12000, ActiveMinutes: 65, SleepHours: 8.0, CaloriesBurned: 3000, SleepQuality: "Excellent" },
    { Date: "2026-06-30", Steps: 12800, ActiveMinutes: 70, SleepHours: 8.3, CaloriesBurned: 3100, SleepQuality: "Excellent" }
  ]
};
