/**
 * DataAI User Interface Manager
 * Manages DOM updates, events, inputs, charts configuration, SQL logs, datagrid pagination, and dark/light modes.
 */

window.DataUI = {
  activeTab: 'overview',
  currentPage: 1,
  rowsPerPage: 12,
  sortCol: null,
  sortDir: 'ASC',

  /**
   * Initialize DOM event bindings and layout configuration
   */
  init: function() {
    this.bindNavigation();
    this.bindFileUploads();
    this.bindChartSelectors();
    this.bindSQLWorkspace();
    this.bindDataGridControls();
    this.bindChatWorkspace();
    this.bindThemeSwitcher();
    this.bindSettings();
  },

  /**
   * Theme switcher controller
   */
  bindThemeSwitcher: function() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (!themeBtn) return;

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('dataai-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('dataai-theme', next);
      this.updateThemeIcon(next);
      
      // Re-render active charts to update grid lines and text colors
      if (window.DataApp && window.DataApp.currentDataset) {
        this.updateCharts();
        this.updateAnalyticsChart();
      }
    });
  },

  updateThemeIcon: function(theme) {
    const icon = document.querySelector('#themeToggleBtn i');
    if (!icon) return;
    if (theme === 'dark') {
      icon.className = 'lucide-sun';
      icon.innerHTML = '<path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';
    } else {
      icon.className = 'lucide-moon';
      icon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>';
    }
  },

  /**
   * Navigation links setup
   */
  bindNavigation: function() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        
        // Block workspace links if no dataset is loaded
        if (!window.DataApp.currentDataset && tab !== 'overview' && tab !== 'settings') {
          this.showToast("Please upload a dataset or load demo data first!", "error");
          return;
        }

        this.switchTab(tab);
      });
    });

    // Landing "Try Demo Sales" link
    const demoSalesBtn = document.getElementById('demoSalesBtn');
    if (demoSalesBtn) {
      demoSalesBtn.addEventListener('click', () => {
        window.DataApp.loadSampleData('sales');
      });
    }

    const demoHealthBtn = document.getElementById('demoHealthBtn');
    if (demoHealthBtn) {
      demoHealthBtn.addEventListener('click', () => {
        window.DataApp.loadSampleData('health');
      });
    }

    // Export PDF Report button
    const pdfBtn = document.getElementById('exportPdfReportBtn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        window.print();
      });
    }
  },

  switchTab: function(tabId) {
    this.activeTab = tabId;

    // Update active class on nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update visibility of views
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
      if (panel.id === `${tabId}Tab`) {
        panel.classList.remove('hidden');
        // Trigger refit/layout on tab entry if required
      } else {
        panel.classList.add('hidden');
      }
    });

    // Special trigger: render analytics prediction charts or SQL maps
    if (tabId === 'visualizations') {
      this.updateCharts();
    } else if (tabId === 'analytics') {
      this.initAnalyticsTabSelectors();
    } else if (tabId === 'sql') {
      this.renderSQLSchemaViewer();
    } else if (tabId === 'dataviewer') {
      this.currentPage = 1;
      this.renderDataGrid();
    }
  },

  /**
   * File Drag & Drop Handlers
   */
  bindFileUploads: function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    // Trigger click on browse text
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        window.DataApp.loadFromFile(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        window.DataApp.loadFromFile(e.target.files[0]);
        // Reset so user can upload the same file again if needed
        fileInput.value = '';
      }
    });
  },

  /**
   * Bind dropdown selectors for custom charts
   */
  bindChartSelectors: function() {
    const selectors = ['chartXSelect', 'chartYSelect', 'chartTypeSelect', 'chartPaletteSelect'];
    selectors.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateCharts());
      }
    });
  },

  /**
   * Refreshes chart in visualizations tab based on dropdown inputs
   */
  updateCharts: function() {
    if (!window.DataApp.currentDataset) return;
    
    const xCol = document.getElementById('chartXSelect').value;
    const yCol = document.getElementById('chartYSelect').value;
    const type = document.getElementById('chartTypeSelect').value;
    const theme = document.getElementById('chartPaletteSelect').value;

    if (!xCol || !yCol) return;

    const data = window.DataApp.currentDataset;
    const labels = data.map(row => String(row[xCol]));
    const series = [{
      label: yCol,
      data: data.map(row => Number(row[yCol]))
    }];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    window.DataCharts.renderChart('workspaceChart', type, labels, series, theme, isDark);
  },

  /**
   * Advanced Analytics sub-views (Correlation and Forecast axis hooks)
   */
  bindSettings: function() {
    const apiInput = document.getElementById('geminiApiKeyInput');
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (!saveBtn || !apiInput) return;

    // Load key from localStorage
    apiInput.value = localStorage.getItem('dataai-gemini-key') || '';

    saveBtn.addEventListener('click', () => {
      const key = apiInput.value.trim();
      localStorage.setItem('dataai-gemini-key', key);
      window.DataApp.geminiKey = key;
      this.showToast("Settings saved successfully!", "success");
      
      // Celebrate if API key entered
      if (key && typeof confetti !== 'undefined') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      }
    });
  },

  initAnalyticsTabSelectors: function() {
    const xSel = document.getElementById('predictXSelect');
    const ySel = document.getElementById('predictYSelect');
    const fInput = document.getElementById('forecastSteps');

    if (!xSel || !ySel) return;

    // Fill independent X axis (Date/Temporal or Index)
    const schema = window.DataApp.schema;
    xSel.innerHTML = "";
    ySel.innerHTML = "";

    // X can be Temporal or Index or Numeric
    Object.keys(schema).forEach(col => {
      const type = schema[col].type;
      if (type === 'temporal' || type === 'numeric') {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        xSel.appendChild(opt);
      }
      if (type === 'numeric') {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        ySel.appendChild(opt);
      }
    });

    // Auto-select defaults
    if (xSel.options.length > 0) xSel.selectedIndex = 0;
    // Set Y index to a different numeric index if possible
    if (ySel.options.length > 1) {
      ySel.selectedIndex = ySel.options.length - 1;
    }

    // Bind change events
    const triggerAnalytics = () => this.updateAnalyticsChart();
    xSel.addEventListener('change', triggerAnalytics);
    ySel.addEventListener('change', triggerAnalytics);
    fInput.addEventListener('change', triggerAnalytics);
    fInput.addEventListener('input', triggerAnalytics);

    this.updateAnalyticsChart();
  },

  updateAnalyticsChart: function() {
    if (!window.DataApp.currentDataset) return;

    const xCol = document.getElementById('predictXSelect').value;
    const yCol = document.getElementById('predictYSelect').value;
    const steps = parseInt(document.getElementById('forecastSteps').value) || 5;

    if (!xCol || !yCol) return;

    const regression = window.DataAnalytics.fitLinearRegression(
      window.DataApp.currentDataset,
      xCol,
      yCol,
      steps
    );

    const coeffContainer = document.getElementById('regressionCoefficients');
    const forecastTbody = document.querySelector('#forecastTable tbody');

    if (!regression) {
      coeffContainer.innerHTML = "<p class='error-text'>Insufficient points to fit regression.</p>";
      return;
    }

    // Render coefficients
    const trendText = regression.slope > 0 ? "↗ Upward Growth" : "↘ Downward Decline";
    const trendClass = regression.slope > 0 ? "trend-up" : "trend-down";
    coeffContainer.innerHTML = `
      <div class="stat-mini-card">
        <span class="label">Directional Trend</span>
        <span class="value ${trendClass}">${trendText}</span>
      </div>
      <div class="stat-mini-card">
        <span class="label">Slope (m)</span>
        <span class="value">${regression.slope} / unit</span>
      </div>
      <div class="stat-mini-card">
        <span class="label">Accuracy (R² Score)</span>
        <span class="value">${(regression.r2 * 100).toFixed(1)}%</span>
      </div>
    `;

    // Render forecast table rows
    forecastTbody.innerHTML = "";
    regression.forecastPoints.forEach(pt => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${pt.x}</td>
        <td>${window.DataInsights.formatNumber(pt.predicted)}</td>
        <td><span class="badge badge-accent">Predicted</span></td>
      `;
      forecastTbody.appendChild(tr);
    });

    // Render combined chart: Actual points, Fitted line, and Forecast line
    const combinedLabels = [
      ...regression.fittedPoints.map(p => p.x),
      ...regression.forecastPoints.map(p => p.x)
    ];

    const actualSeries = [
      ...regression.fittedPoints.map(p => p.actual),
      ...regression.forecastPoints.map(p => null)
    ];

    const trendSeries = [
      ...regression.fittedPoints.map(p => p.predicted),
      ...regression.forecastPoints.map(p => p.predicted)
    ];

    const datasets = [
      { label: `Actual ${yCol}`, data: actualSeries },
      { label: 'Trend / Forecast', data: trendSeries }
    ];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    window.DataCharts.renderChart('analyticsChart', 'line', combinedLabels, datasets, 'sunset', isDark);
  },

  /**
   * Bind SQL Query Execution
   */
  bindSQLWorkspace: function() {
    const runBtn = document.getElementById('runSQLBtn');
    const sqlText = document.getElementById('sqlTextarea');
    const logConsole = document.getElementById('sqlConsoleLog');
    const resultsTable = document.getElementById('sqlResultsTable');

    if (!runBtn || !sqlText) return;

    runBtn.addEventListener('click', () => {
      const query = sqlText.value.trim();
      if (!query) return;

      try {
        logConsole.className = "console-log info";
        logConsole.textContent = "Parsing SQL query and compiling execution plan...";

        const results = window.DataSQLEngine.executeQuery(query, window.DataApp.currentDataset);

        logConsole.className = "console-log success";
        logConsole.textContent = `Query executed successfully: returned ${results.length} rows.`;

        // Render Results Table
        this.renderSQLResults(results);
      } catch (e) {
        logConsole.className = "console-log error";
        logConsole.textContent = `SQL Error: ${e.message}`;
        resultsTable.innerHTML = "";
      }
    });
  },

  renderSQLSchemaViewer: function() {
    const schemaBody = document.getElementById('sqlSchemaBody');
    if (!schemaBody) return;

    schemaBody.innerHTML = "";
    const schema = window.DataApp.schema;

    for (let col in schema) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="code-font">${col}</td>
        <td><span class="badge-type">${schema[col].type}</span></td>
      `;
      schemaBody.appendChild(tr);
    }
  },

  renderSQLResults: function(results) {
    const resultsTable = document.getElementById('sqlResultsTable');
    if (!resultsTable) return;

    if (results.length === 0) {
      resultsTable.innerHTML = `<div class="empty-state">No matching rows returned.</div>`;
      return;
    }

    const columns = Object.keys(results[0]);
    
    // Construct HTML Table
    let tableHtml = `<div class="table-container scrollbar-custom"><table><thead><tr>`;
    columns.forEach(col => {
      tableHtml += `<th>${col}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    results.forEach(row => {
      tableHtml += `<tr>`;
      columns.forEach(col => {
        let val = row[col];
        if (val === null || val === undefined) val = '<span class="null-text">NULL</span>';
        tableHtml += `<td>${val}</td>`;
      });
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    resultsTable.innerHTML = tableHtml;
  },

  /**
   * Data Grid Tab Manager
   */
  bindDataGridControls: function() {
    const searchInput = document.getElementById('gridSearchInput');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.currentPage = 1;
        this.renderDataGrid();
      });
    }

    if (downloadCsvBtn) {
      downloadCsvBtn.addEventListener('click', () => {
        if (!window.DataApp.currentDataset) return;
        this.exportFilteredDataCSV();
      });
    }
  },

  renderDataGrid: function() {
    const gridDiv = document.getElementById('dataGridContainer');
    const paginationDiv = document.getElementById('gridPagination');
    if (!gridDiv || !window.DataApp.currentDataset) return;

    let data = [...window.DataApp.currentDataset];
    const searchVal = document.getElementById('gridSearchInput').value.trim().toLowerCase();

    // 1. Filter data based on search text
    if (searchVal) {
      data = data.filter(row => {
        return Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchVal)
        );
      });
    }

    // 2. Sort data
    if (this.sortCol) {
      data.sort((a, b) => {
        let valA = a[this.sortCol];
        let valB = b[this.sortCol];

        if (valA === undefined) valA = null;
        if (valB === undefined) valB = null;

        if (valA === valB) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        let res = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          res = valA - valB;
        } else {
          res = String(valA).localeCompare(String(valB));
        }
        return this.sortDir === 'ASC' ? res : -res;
      });
    }

    // 3. Paginate
    const totalRecords = data.length;
    const totalPages = Math.ceil(totalRecords / this.rowsPerPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.rowsPerPage;
    const paginatedData = data.slice(startIdx, startIdx + this.rowsPerPage);

    // Save filtered rows for csv download
    this.filteredDataCache = data;

    // 4. Render Table
    const schema = window.DataApp.schema;
    const columns = Object.keys(schema);

    let html = `<table><thead><tr>`;
    columns.forEach(col => {
      const isSorted = this.sortCol === col;
      const arrow = isSorted ? (this.sortDir === 'ASC' ? ' ▴' : ' ▾') : '';
      html += `<th class="sortable-th" onclick="window.DataUI.handleGridSort('${col}')">${col}${arrow}</th>`;
    });
    html += `</tr></thead><tbody>`;

    if (paginatedData.length === 0) {
      html += `<tr><td colspan="${columns.length}" class="center-text py-4">No matching records found.</td></tr>`;
    } else {
      paginatedData.forEach(row => {
        html += `<tr>`;
        columns.forEach(col => {
          let val = row[col];
          if (val === null || val === undefined) {
            html += `<td><span class="null-text">NULL</span></td>`;
          } else {
            html += `<td>${val}</td>`;
          }
        });
        html += `</tr>`;
      });
    }
    html += `</tbody></table>`;
    gridDiv.innerHTML = html;

    // 5. Render Pagination
    let pagHtml = `
      <button class="btn btn-secondary btn-icon" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.DataUI.changeGridPage(${this.currentPage - 1})">
        <i class="lucide-chevron-left">&lt;</i>
      </button>
      <span class="page-indicator">Page <strong>${this.currentPage}</strong> of <strong>${totalPages}</strong> (${totalRecords} items)</span>
      <button class="btn btn-secondary btn-icon" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window.DataUI.changeGridPage(${this.currentPage + 1})">
        <i class="lucide-chevron-right">&gt;</i>
      </button>
    `;
    paginationDiv.innerHTML = pagHtml;
  },

  handleGridSort: function(col) {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortCol = col;
      this.sortDir = 'ASC';
    }
    this.renderDataGrid();
  },

  changeGridPage: function(pageNum) {
    this.currentPage = pageNum;
    this.renderDataGrid();
  },

  exportFilteredDataCSV: function() {
    const data = this.filteredDataCache || window.DataApp.currentDataset;
    if (!data || data.length === 0) return;

    const columns = Object.keys(window.DataApp.schema);
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    csvContent += columns.map(c => `"${c}"`).join(",") + "\r\n";

    // Rows
    data.forEach(row => {
      const line = columns.map(col => {
        let val = row[col];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",");
      csvContent += line + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dataai_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Chat Bot Interactivity
   */
  bindChatWorkspace: function() {
    const sendBtn = document.getElementById('sendChatBtn');
    const textInput = document.getElementById('chatInput');
    
    if (!sendBtn || !textInput) return;

    const triggerSend = () => {
      const query = textInput.value.trim();
      if (!query) return;
      textInput.value = "";
      this.handleUserChatMessage(query);
    };

    sendBtn.addEventListener('click', triggerSend);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSend();
    });

    // Quick suggestions clicks
    const chips = document.querySelectorAll('.chat-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.handleUserChatMessage(chip.textContent.trim());
      });
    });
  },

  handleUserChatMessage: async function(message) {
    const logs = document.getElementById('chatLogs');
    if (!logs) return;

    // Append User Message
    this.appendChatBubble('user', message);

    // Append Loading Bubble
    const loadId = this.appendChatBubble('ai-loading', 'DataAI is parsing parameters...');

    try {
      const app = window.DataApp;
      let reply = "";
      
      if (app.geminiKey) {
        reply = await window.DataInsights.askGeminiAI(
          app.geminiKey,
          message,
          app.currentDataset,
          app.schema,
          app.statistics,
          app.correlations,
          app.anomalies
        );
      } else {
        // Run statistical local queries
        reply = window.DataInsights.askLocalAI(
          message,
          app.currentDataset,
          app.schema,
          app.statistics,
          app.correlations,
          app.anomalies
        );
      }

      // Remove loading bubble and append actual reply
      document.getElementById(loadId)?.remove();
      this.appendChatBubble('ai', reply);
    } catch (e) {
      document.getElementById(loadId)?.remove();
      this.appendChatBubble('ai', `⚠️ Error fetching response: ${e.message}`);
    }
  },

  appendChatBubble: function(sender, text) {
    const logs = document.getElementById('chatLogs');
    if (!logs) return "";

    const bubble = document.createElement('div');
    const bubbleId = `bubble-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    bubble.id = bubbleId;
    bubble.className = `chat-bubble ${sender}`;

    if (sender === 'ai-loading') {
      bubble.innerHTML = `
        <div class="chat-sender">DataAI Analyst</div>
        <div class="loader-dots">
          <span>.</span><span>.</span><span>.</span>
        </div>
      `;
    } else {
      bubble.innerHTML = `
        <div class="chat-sender">${sender === 'user' ? 'You' : 'DataAI Analyst'}</div>
        <div class="chat-text markdown-body">${this.parseMarkdownSimple(text)}</div>
      `;
    }

    logs.appendChild(bubble);
    logs.scrollTop = logs.scrollHeight;
    return bubbleId;
  },

  /**
   * Minimal Markdown compiler for safe chat bubble logs
   */
  parseMarkdownSimple: function(text) {
    // Escaping html
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace Bold headers e.g. ### Header
    escaped = escaped.replace(/^### (.*?)$/gm, '<h5>$1</h5>');
    escaped = escaped.replace(/^#### (.*?)$/gm, '<h6>$1</h6>');

    // Replace bold symbols: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Replace italic symbols: *text*
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Replace code symbols: `code`
    escaped = escaped.replace(/`(.*?)`/g, '<code class="code-inline">$1</code>');

    // Replace linebreaks
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
  },

  /**
   * Populate workspace forms with columns names
   */
  setupDatasetOptions: function() {
    const xSel = document.getElementById('chartXSelect');
    const ySel = document.getElementById('chartYSelect');
    
    if (!xSel || !ySel) return;

    xSel.innerHTML = "";
    ySel.innerHTML = "";

    const schema = window.DataApp.schema;

    for (let col in schema) {
      const type = schema[col].type;
      
      // X Axis options (Categorical, Date or Numerical)
      const xOpt = document.createElement('option');
      xOpt.value = col;
      xOpt.textContent = col;
      xSel.appendChild(xOpt);

      // Y Axis options (strictly numeric columns)
      if (type === 'numeric') {
        const yOpt = document.createElement('option');
        yOpt.value = col;
        yOpt.textContent = col;
        ySel.appendChild(yOpt);
      }
    }

    // Default select indices
    if (xSel.options.length > 0) xSel.selectedIndex = 0;
    if (ySel.options.length > 0) ySel.selectedIndex = 0;
  },

  /**
   * Load dashboard metrics and details
   */
  populateOverviewKPIs: function() {
    const app = window.DataApp;
    const stats = app.statistics;

    // 1. Total Rows
    document.getElementById('kpiTotalRows').textContent = app.currentDataset.length.toLocaleString();
    
    // 2. Attributes count
    document.getElementById('kpiColumns').textContent = Object.keys(app.schema).length;

    // 3. Outlier anomalies
    document.getElementById('kpiAnomalies').textContent = app.anomalies.length;
    const outlierSub = document.getElementById('kpiAnomaliesSub');
    if (app.anomalies.length > 0) {
      outlierSub.textContent = `Extreme skew detected in ${[...new Set(app.anomalies.map(a => a.column))].length} cols`;
      outlierSub.className = "subtext danger-text";
    } else {
      outlierSub.textContent = "Data within standard limits";
      outlierSub.className = "subtext success-text";
    }

    // 4. Primary Metric Avg
    const numCols = Object.keys(app.schema).filter(col => app.schema[col].type === 'numeric');
    const primaryAvgEl = document.getElementById('kpiPrimaryAvg');
    const primaryAvgLabel = document.getElementById('kpiPrimaryLabel');
    
    if (numCols.length > 0) {
      const pCol = numCols[0];
      const val = stats[pCol]?.mean;
      primaryAvgLabel.textContent = `Average ${pCol}`;
      primaryAvgEl.textContent = window.DataInsights.formatNumber(val);
    } else {
      primaryAvgLabel.textContent = "Average Values";
      primaryAvgEl.textContent = "N/A";
    }

    // 5. Automated Narrative Insight Box
    const reportHtml = window.DataUI.parseMarkdownSimple(
      window.DataInsights.generateNarrativeSummary(
        app.currentDataset,
        app.schema,
        app.statistics,
        app.correlations,
        app.anomalies
      )
    );
    document.getElementById('narrativeSummaryContainer').innerHTML = reportHtml;

    // 6. Schema list in Overview
    const schemaTbody = document.querySelector('#overviewSchemaTable tbody');
    if (schemaTbody) {
      schemaTbody.innerHTML = "";
      for (let col in app.schema) {
        const item = app.schema[col];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${col}</strong></td>
          <td><span class="badge badge-${item.type}">${item.type.toUpperCase()}</span></td>
          <td>${item.uniqueCount}</td>
          <td>${item.missingRate.toFixed(1)}%</td>
          <td><code class="code-font">${item.sampleValues.slice(0, 3).join(', ')}</code></td>
        `;
        schemaTbody.appendChild(tr);
      }
    }
  },

  /**
   * Display toast alerts
   */
  showToast: function(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-msg">${message}</span>
      <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
};

// ObjectOption constructor removed in favor of standard document.createElement
