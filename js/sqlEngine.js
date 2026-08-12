/**
 * DataAI Client-Side SQL Engine
 * Parses and executes a subset of standard SQL queries on JS arrays.
 * Supported clauses: SELECT (including SUM, AVG, COUNT, MIN, MAX aggregates), FROM, WHERE, GROUP BY, ORDER BY, LIMIT.
 */

window.DataSQLEngine = {
  /**
   * Run a SQL query on a given dataset
   * @param {string} sqlQuery 
   * @param {Array<Object>} dataset 
   * @returns {Array<Object>} Query results
   */
  executeQuery: function(sqlQuery, dataset) {
    if (!dataset || dataset.length === 0) {
      throw new Error("No active dataset loaded to query.");
    }

    // Clean query
    let query = sqlQuery.trim();
    if (query.endsWith(';')) {
      query = query.substring(0, query.length - 1);
    }

    // Regex to split major clauses
    const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+([`"\w\d_]+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;
    const match = query.match(selectRegex);

    if (!match) {
      throw new Error("Invalid SQL syntax. Supported format: SELECT columns FROM table [WHERE conditions] [GROUP BY column] [ORDER BY columns] [LIMIT number]");
    }

    const selectClause = match[1].trim();
    const tableName = match[2].trim(); // ignored, we query the current dataset
    const whereClause = match[3] ? match[3].trim() : null;
    const groupByClause = match[4] ? match[4].trim() : null;
    const orderByClause = match[5] ? match[5].trim() : null;
    const limitClause = match[6] ? parseInt(match[6].trim()) : null;

    // 1. SELECT Parsing
    const selectItems = this.parseSelectClause(selectClause);

    // 2. WHERE Filtering
    let filteredData = [...dataset];
    if (whereClause) {
      filteredData = this.applyWhereClause(filteredData, whereClause);
    }

    // 3. GROUP BY & Aggregation
    let results = [];
    if (groupByClause) {
      const groupCol = this.cleanIdentifier(groupByClause);
      results = this.applyGroupBy(filteredData, groupCol, selectItems);
    } else {
      // Check if there are aggregate functions in select items without Group By
      const hasAggregates = selectItems.some(item => item.isAggregate);
      if (hasAggregates) {
        results = [this.calculateAggregatesSingleRow(filteredData, selectItems)];
      } else {
        // Plain columns project
        results = this.projectColumns(filteredData, selectItems);
      }
    }

    // 4. ORDER BY Sorting
    if (orderByClause) {
      results = this.applyOrderBy(results, orderByClause);
    }

    // 5. LIMIT Slice
    if (limitClause !== null && !isNaN(limitClause)) {
      results = results.slice(0, limitClause);
    }

    return results;
  },

  /**
   * Cleans quotes and brackets from identifier names
   */
  cleanIdentifier: function(str) {
    return str.replace(/[`"']/g, '').trim();
  },

  /**
   * Parse the SELECT clause into column projection descriptors
   */
  parseSelectClause: function(selectClause) {
    // If SELECT *, return placeholder
    if (selectClause.trim() === '*') {
      return [{ type: 'star', raw: '*', alias: '*' }];
    }

    // Split select items by comma (avoid splitting commas in functions if any, e.g. ROUND(val, 2))
    const rawItems = [];
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
      // Match aggregate function: SUM(Sales) AS TotalSales or SUM(Sales) TotalSales
      // Match optional quotes and spaces around columns
      const aggMatch = item.match(/^(SUM|AVG|COUNT|MIN|MAX)\((.+?)\)(?:\s+AS\s+([`"\w\d_]+)|(?:\s+([`"\w\d_]+)))?$/i);
      if (aggMatch) {
        const func = aggMatch[1].toUpperCase();
        const col = this.cleanIdentifier(aggMatch[2]);
        const alias = this.cleanIdentifier(aggMatch[3] || aggMatch[4] || `${func}_${col}`);
        return {
          isAggregate: true,
          function: func,
          column: col,
          alias: alias,
          raw: item
        };
      }

      // Match normal column: Category AS Cat or Category Cat
      const colMatch = item.match(/^([`"\w\d_\-\s]+)(?:\s+AS\s+([`"\w\d_]+)|(?:\s+([`"\w\d_]+)))?$/i);
      if (colMatch) {
        const col = this.cleanIdentifier(colMatch[1]);
        const alias = this.cleanIdentifier(colMatch[2] || colMatch[3] || col);
        return {
          isAggregate: false,
          column: col,
          alias: alias,
          raw: item
        };
      }

      throw new Error(`Could not parse select item: "${item}"`);
    });
  },

  /**
   * Apply WHERE clauses to filter rows
   */
  applyWhereClause: function(data, whereClause) {
    // Splits clauses by AND/OR. Currently supports simple list of conditions conjoined by AND or OR
    const isOr = whereClause.toUpperCase().includes(' OR ');
    const delimiter = isOr ? /\s+OR\s+/i : /\s+AND\s+/i;
    const condStrings = whereClause.split(delimiter);

    const conditions = condStrings.map(condStr => {
      // Match: col = val, col > val, col LIKE val, col IS NULL, etc.
      const match = condStr.match(/^([`"\w\d_\-\s]+)\s*(=|!=|<>|>|<|>=|<=|LIKE|IS\s+NULL|IS\s+NOT\s+NULL)\s*(.+)?$/i);
      if (!match) {
        throw new Error(`Failed to parse WHERE condition: "${condStr}"`);
      }
      
      const col = this.cleanIdentifier(match[1]);
      const op = match[2].toUpperCase().trim();
      let rawVal = match[3] ? match[3].trim() : null;
      let val = null;

      if (rawVal) {
        // Strip quotes
        if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || 
            (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
          val = rawVal.substring(1, rawVal.length - 1);
        } else if (!isNaN(rawVal) && rawVal !== "") {
          val = Number(rawVal);
        } else {
          val = rawVal;
        }
      }

      return { column: col, operator: op, val: val };
    });

    return data.filter(row => {
      const matchResults = conditions.map(cond => {
        let rowVal = row[cond.column];
        let condVal = cond.val;

        // Normalize if comparison is numeric
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
            // Convert SQL % wildcard to regex
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

  /**
   * Group and aggregate records
   */
  applyGroupBy: function(data, groupCol, selectItems) {
    const groups = {};
    
    data.forEach(row => {
      let key = row[groupCol];
      if (key === undefined || key === null) key = 'NULL';
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    return Object.entries(groups).map(([groupVal, rows]) => {
      const projectedRow = {};
      
      selectItems.forEach(item => {
        if (item.type === 'star') {
          projectedRow[groupCol] = groupVal;
          return;
        }

        if (item.isAggregate) {
          projectedRow[item.alias] = this.computeAggregate(rows, item.column, item.function);
        } else {
          // If it is the group col, set it. Otherwise, pick the first row's value.
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

  /**
   * Calculate aggregates for query when no Group By is used
   */
  calculateAggregatesSingleRow: function(data, selectItems) {
    const projectedRow = {};
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

  /**
   * Compute standard aggregates on a row list
   */
  computeAggregate: function(rows, col, func) {
    const vals = rows
      .map(r => r[col])
      .filter(v => v !== null && v !== undefined && v !== '');

    if (func === 'COUNT') {
      // COUNT(*) or COUNT(col)
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

  /**
   * Standard column projection
   */
  projectColumns: function(data, selectItems) {
    // If SELECT *, return whole row
    if (selectItems[0] && selectItems[0].type === 'star') {
      return data;
    }

    return data.map(row => {
      const projected = {};
      selectItems.forEach(item => {
        projected[item.alias] = row[item.column] !== undefined ? row[item.column] : null;
      });
      return projected;
    });
  },

  /**
   * Apply ORDER BY sorting
   */
  applyOrderBy: function(data, orderByClause) {
    // Match: column DESC or column ASC, currently supports single column sorting
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
        if (valA === null) return 1; // nulls at the end
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
  }
};
