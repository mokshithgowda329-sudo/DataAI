/**
 * DataAI Insights Engine
 * Generates automated narrative reports and powers the conversational AI assistant.
 * Supports a local rule-based analyst and direct integration with Google's Gemini API.
 */

window.DataInsights = {
  /**
   * Generates a structural narrative summary of the dataset
   */
  generateNarrativeSummary: function(dataset, schema, stats, correlations, anomalies) {
    if (!dataset || dataset.length === 0) return "No data available.";

    let summary = `### 📊 DataAI Automated Dataset Brief\n\n`;
    summary += `Your dataset contains **${dataset.length}** records and **${Object.keys(schema).length}** attributes. `;
    
    // Column breakdown
    const types = {};
    for (let col in schema) {
      const t = schema[col].type;
      types[t] = (types[t] || 0) + 1;
    }
    const typeStrings = Object.entries(types).map(([type, count]) => `**${count}** ${type}`);
    summary += `We auto-detected: ${typeStrings.join(', ')} fields.\n\n`;

    // 1. Key Metrics & Averages
    summary += `#### 🔑 Key Field Insights\n`;
    const numericCols = Object.keys(schema).filter(col => schema[col].type === 'numeric');
    if (numericCols.length > 0) {
      numericCols.slice(0, 3).forEach(col => {
        const s = stats[col];
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
        const s = stats[col];
        if (s && s.mode) {
          summary += `- **${col}**: Highly concentrated in category "**${s.mode}**" (**${this.formatNumber(s.topCategories[0].percentage)}%** of values).\n`;
        }
      });
    }
    summary += `\n`;

    // 2. Correlation Highlights
    summary += `#### 🔗 Statistical Correlations\n`;
    let correlationPairs = [];
    const visited = new Set();
    
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

    // 3. Anomaly Summaries
    summary += `#### 🚨 Anomaly & Outlier Flags\n`;
    if (anomalies.length > 0) {
      summary += `- Detected **${anomalies.length}** distinct data points exhibiting statistical anomalies (|Z-Score| > 2.5).\n`;
      const groupAnom = {};
      anomalies.forEach(a => {
        groupAnom[a.column] = (groupAnom[a.column] || 0) + 1;
      });
      for (let col in groupAnom) {
        summary += `  - **${col}** has **${groupAnom[col]}** outliers. `;
        const maxAnom = anomalies.find(a => a.column === col);
        summary += `The most extreme deviation is a value of **${maxAnom.value}** (Z = **${maxAnom.zScore}**).\n`;
      }
    } else {
      summary += `- All values lie within normal standard deviation limits. No anomalies detected.\n`;
    }

    return summary;
  },

  /**
   * Answer data queries locally using rule-based calculations
   */
  askLocalAI: function(query, dataset, schema, stats, correlations, anomalies) {
    const q = query.toLowerCase();

    // 1. Check for stats queries
    for (let col in schema) {
      const colLower = col.toLowerCase();
      if (q.includes(colLower)) {
        const colStats = stats[col];
        if (colStats) {
          if (q.includes("average") || q.includes("mean") || q.includes("avg")) {
            return `📊 **Local AI Analyst:** The average (mean) value for **${col}** is **${this.formatNumber(colStats.mean)}**. The range spans from ${this.formatNumber(colStats.min)} to ${this.formatNumber(colStats.max)}.`;
          }
          if (q.includes("sum") || q.includes("total")) {
            return `📊 **Local AI Analyst:** The cumulative total for **${col}** is **${this.formatNumber(colStats.sum || 0)}**.`;
          }
          if (q.includes("median")) {
            return `📊 **Local AI Analyst:** The median value for **${col}** is **${this.formatNumber(colStats.median)}**.`;
          }
          if (q.includes("min") || q.includes("lowest") || q.includes("smallest")) {
            return `📊 **Local AI Analyst:** The lowest recorded value for **${col}** is **${this.formatNumber(colStats.min)}**.`;
          }
          if (q.includes("max") || q.includes("highest") || q.includes("largest") || q.includes("maximum")) {
            return `📊 **Local AI Analyst:** The highest recorded value for **${col}** is **${this.formatNumber(colStats.max)}**.`;
          }
        }
      }
    }

    // 2. Check for general requests
    if (q.includes("anomaly") || q.includes("outlier") || q.includes("abnormal") || q.includes("sick")) {
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
      const topPairs = [];
      const visited = new Set();
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

    // 3. Fallback instructions for Gemini
    return `🤖 **Local AI Analyst:** I understand your question, but to perform advanced reasoning, custom cross-tabulations, or write elaborate reports, I need access to Gemini. 
\n💡 **Tip:** Go to **Settings** (bottom left sidebar) and input your **Gemini API Key** to activate the fully cognitive AI analyst!
\n*(Currently, I can answer queries like: "average of [column]", "total of [column]", "what are the anomalies", or "show correlations")*`;
  },

  /**
   * Calls the live Google Gemini API (gemini-1.5-flash) to answer dataset questions
   */
  askGeminiAI: async function(apiKey, query, dataset, schema, stats, correlations, anomalies) {
    if (!apiKey) {
      throw new Error("Gemini API key is missing. Configure it in settings.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Construct a dense, token-efficient system context containing the dataset properties
    const schemaSummary = {};
    for (let col in schema) {
      schemaSummary[col] = {
        type: schema[col].type,
        missingRate: schema[col].missingRate.toFixed(1) + "%",
        sampleValues: schema[col].sampleValues
      };
    }

    // Capture first 5 rows of data for schema alignment
    const sampleRows = dataset.slice(0, 8);

    // Filter correlations to only important relationships
    const importantCorrs = [];
    const visited = new Set();
    for (let cX in correlations) {
      for (let cY in correlations[cX]) {
        if (cX === cY) continue;
        const key = [cX, cY].sort().join('-');
        if (visited.has(key)) continue;
        visited.add(key);
        const r = correlations[cX][cY];
        if (r !== null && Math.abs(r) > 0.3) {
          importantCorrs.push(`${cX} & ${cY}: r = ${r}`);
        }
      }
    }

    const systemPrompt = `You are DataAI, an expert, cognitive data analytics assistant. You analyze datasets and provide visually rich, precise, and professional insights.
You are running client-side on the user's browser, inspecting the following dataset details:

## DATASET PROPERTIES:
- Total rows: ${dataset.length}
- Column Schema & Sample Values: ${JSON.stringify(schemaSummary)}
- Strong correlations (Pearson r): ${importantCorrs.join(', ')}
- Anomaly Count: ${anomalies.length}
- Top Anomalies (outliers): ${JSON.stringify(anomalies.slice(0, 5).map(a => ({ row: a.rowIndex, col: a.column, val: a.value, zScore: a.zScore })))}
- Sample Data Rows (first 8 rows): ${JSON.stringify(sampleRows)}

## INSTRUCTIONS:
1. Provide a highly accurate, professional response.
2. Format your response in markdown. Use bullet points, bold accents, and tables where helpful.
3. Be concise and practical. Focus on trends, correlations, business predictions, or anomaly resolutions based on the columns.
4. Do not make up facts outside the provided scope. If a calculation is requested that you cannot perform directly, explain your mathematical reasoning.
5. If the user asks you to write code, provide standard JS or SQL snippets.

User's Question: "${query}"`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP ${response.status} Error`);
      }

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error("Empty response received from Gemini.");
      }

      return text;
    } catch (e) {
      throw new Error(`Gemini API Error: ${e.message}`);
    }
  },

  /**
   * Helper to format numbers for narrative readability
   */
  formatNumber: function(num) {
    if (num === null || num === undefined || isNaN(num)) return "N/A";
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    }
    if (Math.abs(num) >= 1000) {
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return Number(num.toFixed(3));
  }
};
