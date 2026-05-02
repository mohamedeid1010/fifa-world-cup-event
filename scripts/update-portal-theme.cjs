const fs = require('fs');
const path = require('path');

const styleCssPath = path.join(__dirname, '..', 'src', 'style', 'style.css');
let css = fs.readFileSync(styleCssPath, 'utf8');

css = css.replace(/--portal-orange: #fb923c;/g, '--portal-orange: #38bdf8;');
css = css.replace(/--portal-orange-strong: #f97316;/g, '--portal-orange-strong: #0f62fe;');
css = css.replace(/--portal-gold: #fbbf24;/g, '--portal-gold: #38bdf8;');
css = css.replace(/--portal-bg: #f6ede3;/g, '--portal-bg: #f8fafc;');
css = css.replace(/--portal-text: #1f2937;/g, '--portal-text: #0f172a;');
css = css.replace(/--portal-muted: #8b5e34;/g, '--portal-muted: #64748b;');

css = css.replace(
  /\.portal-mode \.navbar \{\n  background: linear-gradient\(135deg, rgba\(8, 15, 31, 0.88\), rgba\(15, 23, 42, 0.72\)\);\n  border-color: rgba\(255, 255, 255, 0.12\);\n  box-shadow: 0 20px 48px rgba\(2, 8, 23, 0.34\);\n\}/,
  `.portal-mode .navbar {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(241, 245, 249, 0.72));
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
}`
);

css = css.replace(
  /\.portal-mode \.fifa-logo text \{\n  fill: #ffffff;\n\}/,
  `.portal-mode .fifa-logo text {
  fill: #0f172a;
}`
);

css = css.replace(
  /\.portal-mode \.nav-toggle \{\n  background: rgba\(255, 255, 255, 0.08\);\n  border-color: rgba\(255, 255, 255, 0.12\);\n\}/,
  `.portal-mode .nav-toggle {
  background: rgba(15, 23, 42, 0.06);
  border-color: rgba(15, 23, 42, 0.12);
}`
);

css = css.replace(
  /\.portal-mode \.nav-toggle span \{\n  background: #ffffff;\n\}/,
  `.portal-mode .nav-toggle span {
  background: #0f172a;
}`
);

css = css.replace(
  /\.portal-mode \.nav-links \{\n  background: rgba\(255, 255, 255, 0.06\);\n  border-color: rgba\(255, 255, 255, 0.08\);\n\}/,
  `.portal-mode .nav-links {
  background: rgba(15, 23, 42, 0.04);
  border-color: rgba(15, 23, 42, 0.06);
}`
);

css = css.replace(
  /\.portal-mode \.nav-links a,\n\.portal-mode \.nav-link,\n\.portal-mode \.account-area,\n\.portal-mode #profile-greeting \{\n  color: #ffffff;\n\}/,
  `.portal-mode .nav-links a,
.portal-mode .nav-link,
.portal-mode .account-area,
.portal-mode #profile-greeting {
  color: #475569;
}`
);

css = css.replace(
  /\.portal-mode \.nav-links a:hover,\n\.portal-mode \.nav-link:hover \{\n  color: #ffffff;\n  background: rgba\(255, 255, 255, 0.08\);\n\}/,
  `.portal-mode .nav-links a:hover,
.portal-mode .nav-link:hover {
  color: #0f172a;
  background: rgba(15, 23, 42, 0.06);
}`
);

css = css.replace(
  /\.portal-mode \.nav-link\.is-active,\n\.portal-mode \.nav-link\[aria-current='page'\] \{\n  background: #ffffff;\n  color: #0f172a;\n  box-shadow: 0 12px 28px rgba\(255, 255, 255, 0.16\);\n\}/,
  `.portal-mode .nav-link.is-active,
.portal-mode .nav-link[aria-current='page'] {
  background: #0f62fe;
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 98, 254, 0.25);
}`
);

css = css.replace(
  /\.portal-mode \.user-profile \{\n  background: rgba\(255, 255, 255, 0.12\);\n  border: none;\n\}/,
  `.portal-mode .user-profile {
  background: rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(15, 23, 42, 0.1);
}`
);

css = css.replace(
  /\.portal-mode \.account-area \{\n  background: rgba\(255, 255, 255, 0.08\);\n  border-color: rgba\(255, 255, 255, 0.12\);\n\}/,
  `.portal-mode .account-area {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(15, 23, 42, 0.1);
}`
);

css = css.replace(
  /\.portal-mode \.account-area:hover \.user-profile \{\n  background: rgba\(255, 255, 255, 0.18\);\n\}/,
  `.portal-mode .account-area:hover .user-profile {
  background: rgba(15, 23, 42, 0.12);
}`
);

css = css.replace(
  /\.portal-mode #profile-status \{\n  color: #cbd5e1;\n\}/,
  `.portal-mode #profile-status {
  color: #64748b;
}`
);

fs.writeFileSync(styleCssPath, css);
console.log('Portal theme updated in src/style/style.css');