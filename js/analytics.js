/**
 * DataAI Statistical and Predictive Analytics Engine
 * Provides client-side calculations for basic stats, correlations, anomalies (Z-Score), and linear regressions.
 */

window.DataAnalytics = {
  /**
   * Calculate basic statistics for all columns based on schema
   * @param {Array<Object>} dataset 
   * @param {Object} schema 
   * @returns {Object} Statistics report
   */
  calculateBasicStats: function(dataset, schema) {
    const stats = {};
    const totalRows = dataset.length;

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
        
        // Median
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
        
        // Min, Max
        const min = values[0];
        const max = values[values.length - 1];

        // Variance & StdDev
        const sqDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = sqDiffs.reduce((acc, v) => acc + v, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        stats[col] = {
          type: 'numeric',
          count: values.length,
          sum: sum,
          mean: mean,
          median: median,
          min: min,
          max: max,
          variance: variance,
          stdDev: stdDev,
          range: max - min
        };
      } else if (type === 'categorical' || type === 'text') {
        const frequencies = {};
        let validCount = 0;

        dataset.forEach(row => {
          const val = row[col];
          if (val !== null && val !== undefined && val !== '') {
            frequencies[val] = (frequencies[val] || 0) + 1;
            validCount++;
          }
        });

        // Sort frequencies
        const sortedFreq = Object.entries(frequencies)
          .map(([key, count]) => ({
            value: key,
            count: count,
            percentage: (count / validCount) * 100
          }))
          .sort((a, b) => b.count - a.count);

        stats[col] = {
          type: type,
          count: validCount,
          uniqueCount: sortedFreq.length,
          topCategories: sortedFreq.slice(0, 10), // top 10 frequencies
          mode: sortedFreq.length > 0 ? sortedFreq[0].value : null
        };
      } else if (type === 'temporal') {
        const dates = dataset
          .map(row => row[col] ? new Date(row[col]) : null)
          .filter(d => d && !isNaN(d.getTime()));

        if (dates.length > 0) {
          dates.sort((a, b) => a.getTime() - b.getTime());
          stats[col] = {
            type: 'temporal',
            count: dates.length,
            minDate: dates[0].toISOString().split('T')[0],
            maxDate: dates[dates.length - 1].toISOString().split('T')[0],
            rangeDays: Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
          };
        }
      }
    }

    return stats;
  },

  /**
   * Calculate Pearson Correlation Matrix between all numeric columns
   */
  calculateCorrelations: function(dataset, schema) {
    const numericCols = Object.keys(schema).filter(col => schema[col].type === 'numeric');
    const matrix = {};

    numericCols.forEach(colX => {
      matrix[colX] = {};
      numericCols.forEach(colY => {
        if (colX === colY) {
          matrix[colX][colY] = 1;
          return;
        }

        // Gather aligned pairs
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
   * Perform Z-score anomaly detection across all numeric columns
   * Outlier threshold default is Z > 2.5
   */
  detectAnomalies: function(dataset, schema, stats, threshold = 2.5) {
    const anomalies = [];
    const numericCols = Object.keys(schema).filter(col => schema[col].type === 'numeric');

    numericCols.forEach(col => {
      const colStats = stats[col];
      if (!colStats || colStats.stdDev === 0) return;

      dataset.forEach((row, index) => {
        const val = row[col];
        if (val === null || val === undefined || isNaN(val)) return;

        const zScore = (Number(val) - colStats.mean) / colStats.stdDev;
        if (Math.abs(zScore) > threshold) {
          anomalies.push({
            rowIndex: index + 1, // 1-indexed for user display
            column: col,
            value: val,
            mean: colStats.mean,
            stdDev: colStats.stdDev,
            zScore: Number(zScore.toFixed(2)),
            row: row
          });
        }
      });
    });

    // Sort by absolute Z-score descending
    return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  },

  /**
   * Fits a linear regression line y = mx + c to predict future values
   * If X is a date, it converts dates to indices for prediction.
   * @param {Array<Object>} dataset 
   * @param {string} xCol - Independent variable (e.g. date index or numeric column)
   * @param {string} yCol - Dependent variable (numeric)
   * @param {number} forecastCount - Number of periods to forecast
   */
  fitLinearRegression: function(dataset, xCol, yCol, forecastCount = 5) {
    // Determine if xCol is date/temporal
    const isDate = dataset.some(row => {
      const val = row[xCol];
      return val && isNaN(val) && !isNaN(Date.parse(val));
    });

    // Construct numeric series for modeling
    let dataPoints = dataset.map((row, idx) => {
      let xVal = row[xCol];
      let yVal = Number(row[yCol]);
      
      let xNum = idx; // Default index
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
        label: label
      };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x !== null && p.y !== null);

    // Sort points by x value to ensure correct sequence for lines
    dataPoints.sort((a, b) => a.x - b.x);

    if (dataPoints.length < 2) {
      return null;
    }

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
    const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);
    const sumY2 = dataPoints.reduce((acc, p) => acc + p.y * p.y, 0);

    const mDenominator = (n * sumX2) - (sumX * sumX);
    if (mDenominator === 0) return null;

    const slope = ((n * sumXY) - (sumX * sumY)) / mDenominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (Coefficient of Determination)
    const meanY = sumY / n;
    const totalSumSq = dataPoints.reduce((acc, p) => acc + Math.pow(p.y - meanY, 2), 0);
    const residualSumSq = dataPoints.reduce((acc, p) => {
      const predY = slope * p.x + intercept;
      return acc + Math.pow(p.y - predY, 2);
    }, 0);

    const r2 = totalSumSq === 0 ? 1 : 1 - (residualSumSq / totalSumSq);

    // Generate fitted line points
    const fittedPoints = dataPoints.map(p => ({
      x: p.originalX,
      xNum: p.x,
      actual: p.y,
      predicted: Number((slope * p.x + intercept).toFixed(4)),
      label: p.label
    }));

    // Generate forecast points
    const forecastPoints = [];
    if (forecastCount > 0 && dataPoints.length > 1) {
      // Calculate intervals of X
      let xInterval = 1;
      if (isDate) {
        // Find average difference between consecutive dates
        let totalDiff = 0;
        for (let i = 1; i < dataPoints.length; i++) {
          totalDiff += dataPoints[i].x - dataPoints[i - 1].x;
        }
        xInterval = totalDiff / (dataPoints.length - 1);
      } else {
        let totalDiff = 0;
        for (let i = 1; i < dataPoints.length; i++) {
          totalDiff += dataPoints[i].x - dataPoints[i - 1].x;
        }
        xInterval = totalDiff / (dataPoints.length - 1);
        if (xInterval === 0) xInterval = 1;
      }

      let lastPoint = dataPoints[dataPoints.length - 1];
      
      for (let i = 1; i <= forecastCount; i++) {
        const nextXNum = lastPoint.x + (i * xInterval);
        const predictedVal = slope * nextXNum + intercept;
        
        let displayX = `Fct +${i}`;
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
      isDate: isDate,
      fittedPoints: fittedPoints,
      forecastPoints: forecastPoints
    };
  }
};
