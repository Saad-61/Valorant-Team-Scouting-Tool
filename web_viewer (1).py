"""
Web-based DuckDB Viewer
Simple HTML interface to browse and query the database.
Run this and open http://localhost:8000 in your browser.
"""

import duckdb
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse

DB_PATH = Path(__file__).parent / "valorant_esports.duckdb"


class DatabaseViewer(BaseHTTPRequestHandler):
    
    def do_GET(self):
        """Handle GET requests."""
        path = urllib.parse.urlparse(self.path)
        
        if path.path == '/':
            self.send_html()
        elif path.path == '/api/tables':
            self.send_tables()
        elif path.path == '/api/query':
            query = urllib.parse.parse_qs(path.query).get('q', [''])[0]
            self.execute_query(query)
        elif path.path == '/api/schema':
            table = urllib.parse.parse_qs(path.query).get('table', [''])[0]
            self.get_schema(table)
        elif path.path == '/api/data':
            table = urllib.parse.parse_qs(path.query).get('table', [''])[0]
            limit = urllib.parse.parse_qs(path.query).get('limit', ['100'])[0]
            self.get_table_data(table, int(limit))
        else:
            self.send_error(404)
    
    def send_html(self):
        """Send the HTML interface."""
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>VALORANT Esports Database</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0f1419;
            color: #ece8e1;
            padding: 20px;
        }
        .header {
            background: #ff4655;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(255,70,85,0.3);
        }
        h1 { color: white; margin-bottom: 5px; }
        .subtitle { color: #ece8e1; opacity: 0.9; }
        .container {
            display: grid;
            grid-template-columns: 250px 1fr;
            gap: 20px;
            height: calc(100vh - 180px);
        }
        .sidebar {
            background: #1c2128;
            border-radius: 8px;
            padding: 15px;
            overflow-y: auto;
        }
        .main {
            background: #1c2128;
            border-radius: 8px;
            padding: 20px;
            overflow-y: auto;
        }
        .table-list {
            list-style: none;
        }
        .table-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
            cursor: pointer;
            background: #2d333b;
            transition: background 0.2s;
        }
        .table-item:hover {
            background: #3d444d;
        }
        .table-item.active {
            background: #ff4655;
            color: white;
        }
        .view-item {
            padding: 8px 10px;
            margin: 3px 0;
            border-radius: 4px;
            cursor: pointer;
            background: #2d333b;
            opacity: 0.8;
            font-size: 0.9em;
            transition: all 0.2s;
        }
        .view-item:hover {
            background: #3d444d;
            opacity: 1;
        }
        .section-title {
            font-size: 0.85em;
            color: #768390;
            margin: 15px 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #2d333b;
        }
        th {
            background: #2d333b;
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        tr:hover {
            background: #2d333b;
        }
        .query-box {
            margin-bottom: 15px;
        }
        textarea {
            width: 100%;
            padding: 12px;
            background: #0d1117;
            border: 1px solid #2d333b;
            border-radius: 4px;
            color: #ece8e1;
            font-family: 'Consolas', monospace;
            font-size: 14px;
            min-height: 80px;
            resize: vertical;
        }
        button {
            background: #ff4655;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 10px;
        }
        button:hover {
            background: #ff5666;
        }
        .error {
            background: #dc3545;
            color: white;
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .info {
            color: #768390;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .count {
            color: #768390;
            font-size: 0.85em;
            margin-left: 8px;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #768390;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ VALORANT Esports Database</h1>
        <div class="subtitle">Cloud9 Hackathon - Tactical Scouting Tool</div>
    </div>
    
    <div class="container">
        <div class="sidebar" id="sidebar">
            <div class="loading">Loading tables...</div>
        </div>
        
        <div class="main">
            <div class="query-box">
                <textarea id="query" placeholder="Enter SQL query...">SELECT * FROM series LIMIT 10</textarea>
                <button onclick="executeQuery()">Run Query</button>
            </div>
            <div id="result"></div>
        </div>
    </div>
    
    <script>
        let currentTable = null;
        
        async function loadTables() {
            const response = await fetch('/api/tables');
            const data = await response.json();
            
            let html = '<div class="section-title">Tables</div><ul class="table-list">';
            data.tables.forEach(table => {
                html += `<li class="table-item" onclick="loadTable('${table.name}')">
                    ${table.name}<span class="count">${table.count}</span>
                </li>`;
            });
            html += '</ul>';
            
            html += '<div class="section-title">Views</div><ul class="table-list">';
            data.views.forEach(view => {
                html += `<li class="view-item" onclick="loadView('${view}')">${view}</li>`;
            });
            html += '</ul>';
            
            document.getElementById('sidebar').innerHTML = html;
        }
        
        async function loadTable(tableName) {
            currentTable = tableName;
            document.querySelectorAll('.table-item').forEach(el => el.classList.remove('active'));
            event.target.classList.add('active');
            
            document.getElementById('result').innerHTML = '<div class="loading">Loading data...</div>';
            
            const response = await fetch(`/api/data?table=${tableName}&limit=100`);
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('result').innerHTML = `<div class="error">${data.error}</div>`;
                return;
            }
            
            displayResults(data);
        }
        
        async function loadView(viewName) {
            document.getElementById('query').value = `SELECT * FROM ${viewName} LIMIT 100`;
            executeQuery();
        }
        
        async function executeQuery() {
            const query = document.getElementById('query').value;
            if (!query.trim()) return;
            
            document.getElementById('result').innerHTML = '<div class="loading">Executing query...</div>';
            
            const response = await fetch(`/api/query?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.error) {
                document.getElementById('result').innerHTML = `<div class="error">${data.error}</div>`;
                return;
            }
            
            displayResults(data);
        }
        
        function displayResults(data) {
            if (data.rows.length === 0) {
                document.getElementById('result').innerHTML = '<div class="info">No rows returned</div>';
                return;
            }
            
            let html = '<table><thead><tr>';
            data.columns.forEach(col => {
                html += `<th>${col}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            data.rows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    let cellValue = cell === null ? '<i>NULL</i>' : String(cell);
                    if (cellValue.length > 100) {
                        cellValue = cellValue.substring(0, 100) + '...';
                    }
                    html += `<td>${cellValue}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            html += `<div class="info">${data.rows.length} rows returned</div>`;
            
            document.getElementById('result').innerHTML = html;
        }
        
        // Load tables on page load
        loadTables();
        
        // Allow Ctrl+Enter to execute query
        document.getElementById('query').addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                executeQuery();
            }
        });
    </script>
</body>
</html>
        """
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def send_tables(self):
        """Send list of tables and views."""
        try:
            conn = duckdb.connect(str(DB_PATH), read_only=True)
            
            tables = conn.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """).fetchall()
            
            tables_with_counts = []
            for (name,) in tables:
                count = conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
                tables_with_counts.append({'name': name, 'count': count})
            
            views = conn.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'main' AND table_type = 'VIEW'
                ORDER BY table_name
            """).fetchall()
            
            views_list = [v[0] for v in views]
            
            conn.close()
            
            self.send_json({'tables': tables_with_counts, 'views': views_list})
            
        except Exception as e:
            self.send_json({'error': str(e)})
    
    def get_schema(self, table):
        """Get schema for a table."""
        try:
            conn = duckdb.connect(str(DB_PATH), read_only=True)
            result = conn.execute(f"DESCRIBE {table}").fetchall()
            conn.close()
            
            schema = [{'column': r[0], 'type': r[1]} for r in result]
            self.send_json({'schema': schema})
            
        except Exception as e:
            self.send_json({'error': str(e)})
    
    def get_table_data(self, table, limit):
        """Get data from a table."""
        try:
            conn = duckdb.connect(str(DB_PATH), read_only=True)
            result = conn.execute(f"SELECT * FROM {table} LIMIT {limit}").fetchall()
            columns = [desc[0] for desc in conn.description]
            conn.close()
            
            self.send_json({'columns': columns, 'rows': result})
            
        except Exception as e:
            self.send_json({'error': str(e)})
    
    def execute_query(self, query):
        """Execute a SQL query."""
        try:
            conn = duckdb.connect(str(DB_PATH), read_only=True)
            result = conn.execute(query).fetchall()
            columns = [desc[0] for desc in conn.description] if conn.description else []
            conn.close()
            
            self.send_json({'columns': columns, 'rows': result})
            
        except Exception as e:
            self.send_json({'error': str(e)})
    
    def send_json(self, data):
        """Send JSON response."""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())
    
    def log_message(self, format, *args):
        """Suppress log messages."""
        pass


def start_viewer(port=8000):
    """Start the web viewer."""
    print("="*60)
    print("VALORANT ESPORTS DATABASE VIEWER")
    print("="*60)
    print(f"Database: {DB_PATH}")
    print(f"\n🌐 Open in browser: http://localhost:{port}")
    print("\nPress Ctrl+C to stop")
    print("="*60)
    
    server = HTTPServer(('localhost', port), DatabaseViewer)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    start_viewer(port)
