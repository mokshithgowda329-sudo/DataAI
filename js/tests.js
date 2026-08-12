/**
 * DataAI Verification Suite
 * Performs verification tests on data parsing, analytics calculations, and SQL query execution.
 * Prints results to the browser console.
 */

window.DataAI_Tests = {
  runAll: function() {
    console.group("🧪 DataAI Core Engine Self-Test Suite");
    
    let passed = 0;
    let failed = 0;

    const test = (name, fn) => {
      try {
        fn();
        console.log(`%c[PASS] ${name}`, "color: #10b981; font-weight: bold;");
        passed++;
      } catch (err) {
        console.error(`[FAIL] ${name}:`, err);
        failed++;
      }
    };

    // --- TEST 1: CSV Parser ---
    test("CSV Parser - Normal and Numeric conversion", () => {
      const csvStr = "Name,Age,Active\nAlice,30,true\nBob,25,false\nCharlie,,true";
      // PapaParse is async, but we can do a mock test on our sanitize method
      const parsed = [
        { Name: "Alice", Age: "30", Active: "true" },
        { Name: "Bob", Age: "25", Active: "false" }
      ];
      const sanitized = window.DataParser.sanitizeObjects(parsed);
      
      if (sanitized[0].Age !== 30) throw new Error(`Age failed to parse as number, got: ${typeof sanitized[0].Age}`);
      if (sanitized[1].Age !== 25) throw new Error("Bob's Age did not parse correctly");
    });

    // --- TEST 2: Basic Stats ---
    test("Analytics - Basic Stats calculations", () => {
      const sample = [
        { Val: 10 }, { Val: 20 }, { Val: 30 }
      ];
      const schema = { Val: { type: 'numeric' } };
      const stats = window.DataAnalytics.calculateBasicStats(sample, schema);

      const colStats = stats.Val;
      if (!colStats) throw new Error("Stats not calculated for column Val");
      if (colStats.mean !== 20) throw new Error(`Expected mean 20, got: ${colStats.mean}`);
      if (colStats.sum !== 60) throw new Error(`Expected sum 60, got: ${colStats.sum}`);
      if (colStats.min !== 10) throw new Error(`Expected min 10, got: ${colStats.min}`);
      if (colStats.max !== 30) throw new Error(`Expected max 30, got: ${colStats.max}`);
      if (colStats.median !== 20) throw new Error(`Expected median 20, got: ${colStats.median}`);
    });

    // --- TEST 3: Outlier Flags ---
    test("Analytics - Outlier detection via Z-Scores", () => {
      // 10 elements: 9 are 5, 1 is 100 (extreme anomaly)
      const sample = [
        { Val: 5 }, { Val: 5 }, { Val: 5 }, { Val: 5 },
        { Val: 5 }, { Val: 5 }, { Val: 5 }, { Val: 5 },
        { Val: 5 }, { Val: 100 }
      ];
      const schema = { Val: { type: 'numeric' } };
      const stats = window.DataAnalytics.calculateBasicStats(sample, schema);
      const outliers = window.DataAnalytics.detectAnomalies(sample, schema, stats, 2.0); // low threshold for testing

      if (outliers.length !== 1) throw new Error(`Expected exactly 1 outlier, got: ${outliers.length}`);
      if (outliers[0].value !== 100) throw new Error(`Expected outlier value 100, got: ${outliers[0].value}`);
    });

    // --- TEST 4: Regression line fitting ---
    test("Analytics - Linear Regression trend & prediction fit", () => {
      // Data matching perfectly y = 2x + 5
      const sample = [
        { X: 1, Y: 7 },
        { X: 2, Y: 9 },
        { X: 3, Y: 11 },
        { X: 4, Y: 13 }
      ];
      const regression = window.DataAnalytics.fitLinearRegression(sample, 'X', 'Y', 2);
      
      if (!regression) throw new Error("Regression fitting failed");
      if (Math.abs(regression.slope - 2) > 0.001) throw new Error(`Expected slope 2, got: ${regression.slope}`);
      if (Math.abs(regression.intercept - 5) > 0.001) throw new Error(`Expected intercept 5, got: ${regression.intercept}`);
      if (regression.r2 !== 1) throw new Error(`Expected R-squared 1.00 (perfect fit), got: ${regression.r2}`);
      
      // Check forecasts (forecast for x=5, x=6) -> expected y=15, y=17
      if (Math.abs(regression.forecastPoints[0].predicted - 15) > 0.001) {
        throw new Error(`Expected forecast +1 to be 15, got: ${regression.forecastPoints[0].predicted}`);
      }
    });

    // --- TEST 5: SQL Interpreter Engine ---
    test("SQL Engine - Queries with WHERE, GROUP BY, aggregates, and ORDER BY", () => {
      const db = [
        { Cat: "A", Sales: 100, Region: "North" },
        { Cat: "A", Sales: 150, Region: "South" },
        { Cat: "B", Sales: 200, Region: "North" },
        { Cat: "B", Sales: 50, Region: "North" }
      ];

      // Query 1: Filter where region is North
      const q1 = "SELECT Sales FROM dataset WHERE Region = 'North'";
      const res1 = window.DataSQLEngine.executeQuery(q1, db);
      if (res1.length !== 3) throw new Error(`Expected 3 rows matching region North, got: ${res1.length}`);

      // Query 2: Group By & Sum
      const q2 = "SELECT Cat, SUM(Sales) AS Total FROM dataset GROUP BY Cat ORDER BY Total DESC";
      const res2 = window.DataSQLEngine.executeQuery(q2, db);
      
      if (res2.length !== 2) throw new Error(`Expected 2 grouped categories, got: ${res2.length}`);
      if (res2[0].Cat !== 'B') throw new Error(`Expected Category B to be first (250 sales), got: ${res2[0].Cat}`);
      if (res2[0].Total !== 250) throw new Error(`Expected Category B Sales total 250, got: ${res2[0].Total}`);
      if (res2[1].Total !== 250) throw new Error(`Expected Category A Sales total 250 (100+150), got: ${res2[1].Total}`);
    });

    console.groupEnd();
    console.log(`%cSelf-Test summary: ${passed} passed, ${failed} failed.`, 
      `color: ${failed === 0 ? '#10b981' : '#ef4444'}; font-weight: bold;`);
    
    return { passed, failed };
  }
};

// Auto-run testing when page completes loading
document.addEventListener('DOMContentLoaded', () => {
  // Delay slightly to allow other systems to bind window variables
  setTimeout(() => {
    window.DataAI_Tests.runAll();
  }, 1000);
});
