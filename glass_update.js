const fs = require('fs');
let css = fs.readFileSync('public/css/main.css', 'utf8');

// 1. Rewrite CSS Variables
css = css.replace(/:root\s*\{([\s\S]*?)\}/, `:root {
  --accent: #00d4ff;
  --accent-glow: rgba(0, 212, 255, 0.4);
  --green: #00ff9d;
  --orange: #ff8c00;
  --red: #ff4757;
  --purple: #a855f7;
  --yellow: #fbbf24;

  --bg-primary: #0a0b10;
  --bg-secondary: rgba(255, 255, 255, 0.02);
  
  /* Glass Variables */
  --bg-card: rgba(15, 20, 35, 0.4);
  --bg-elevated: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-border-light: rgba(255, 255, 255, 0.15);
  --glass-blur: blur(24px);
  --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.37);

  --text-primary: #ffffff;
  --text-secondary: #c2c9d6;
  --text-muted: #8b95a5;

  --border: rgba(255, 255, 255, 0.1);
  --border-accent: rgba(0, 212, 255, 0.3);

  --sidebar-w: 240px;
  --header-h: 60px;

  --radius: 16px;
  --radius-sm: 8px;
  --radius-lg: 24px;

  --shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  --shadow-accent: 0 0 30px rgba(0, 212, 255, 0.1);

  --transition: all 0.3s ease;
  --font: 'Inter', system-ui, -apple-system, sans-serif;
}`);

// 2. Rewrite animated BG for vibrant mesh gradient
css = css.replace(/body::before\s*\{([\s\S]*?)\}/, `body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(circle at 15% 50%, rgba(106, 13, 173, 0.4), transparent 50%),
    radial-gradient(circle at 85% 30%, rgba(0, 212, 255, 0.3), transparent 50%),
    radial-gradient(circle at 50% 80%, rgba(0, 255, 157, 0.2), transparent 50%);
  background-color: var(--bg-primary);
  pointer-events: none;
  z-index: -1;
}`);

// Remove any background-color assignment from body just in case it overrides
css = css.replace(/body \{ font-family: var\(--font\); background: var\(--bg-primary\);/g, `body { font-family: var(--font); background: transparent;`);

// 3. Make the Sidebar Glass
css = css.replace(/\.sidebar\s*\{([\s\S]*?)\}/, `.sidebar {
  width: var(--sidebar-w);
  position: fixed;
  top: 0; left: 0; bottom: 0;
  background: var(--bg-card);
  border-right: 1px solid var(--glass-border);
  display: flex; flex-direction: column;
  z-index: 100;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-glass);
}`);

// 4. Make Top Header Glass
css = css.replace(/\.top-header\s*\{([\s\S]*?)\}/, `.top-header {
  height: var(--header-h);
  background: var(--bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 20px; position: sticky; top: 0; z-index: 90;
  box-shadow: 0 4px 30px rgba(0,0,0,0.1);
}`);

// 5. Make Cards Glass
css = css.replace(/\.card\s*\{([\s\S]*?)\}/, `.card {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-glass);
}`);

// 6. Make Modals Glass
css = css.replace(/\.modal-content\s*\{([\s\S]*?)\}/, `.modal-content {
  background: var(--bg-card);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid var(--glass-border-light);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%; max-width: 500px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}`);

// 7. Make Inputs and Tables adapt to Glass
css = css.replace(/\.form-control\s*\{([\s\S]*?)\}/, `.form-control {
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: var(--transition);
  backdrop-filter: blur(10px);
}
.form-control:focus { border-color: var(--accent); background: rgba(0, 0, 0, 0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }`);

css = css.replace(/\.data-table\s*\{([\s\S]*?)\}/, `.data-table {
  width: 100%; border-collapse: separate; border-spacing: 0;
}
.data-table th {
  background: rgba(255,255,255,0.03);
  padding: 12px 16px; text-align: left;
  font-size: 11px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 1px;
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(4px);
}
.data-table td {
  padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 13px; font-weight: 500;
  color: var(--text-primary);
}
.data-table tr:hover td { background: rgba(255,255,255,0.02); }`);

// 8. Improve text readability
css += `
/* Enhanced Text Contrast for Glassmorphism */
h1, h2, h3, h4, h5, .page-title, .card-title, .header-title {
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}
.stat-value {
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}
`;

fs.writeFileSync('public/css/main.css', css);
console.log('Successfully applied Glassmorphism to main.css');
