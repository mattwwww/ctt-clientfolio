import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const CLIENTS_KEY = 'clientfolio-clients-v2';
const REPORTS_KEY = 'clientfolio-reports-v2';
const LEGACY_CLIENTS_KEY = 'clientfolio-clients';
const LEGACY_REPORTS_KEY = 'clientfolio-reports';
const memoryStorage = new Map();

const COVERAGE_TYPES = [
  '人壽 / Life',
  '危疾 / Critical illness',
  '意外 / Accident',
  '醫療 / Medical',
  '年金 / Annuity',
  '儲蓄 / Savings',
  '投資 / Investment',
  '其他 / Others'
];

const CONTRIBUTION_FREQUENCIES = [
  ['monthly', '月供 / Monthly'],
  ['annual', '年供 / Annual'],
  ['lump-sum', '一次過 / Lump sum']
];

const seedClients = [
  {
    id: 'client-emily-chan', name: 'Emily Chan', chineseName: '陳美玲', phone: '+852 9123 4567', email: 'emily.chan@email.com',
    idNumber: 'A123456(7)', address: 'Wan Chai, Hong Kong', occupation: 'Marketing Director', notes: '',
    createdAt: '2026-07-31', updatedAt: '2026-07-31',
    policies: [{ id: 'policy-emily-1', coverageType: '人壽 / Life', company: 'Manulife', policyNumber: 'M-1001', policyName: 'Whole Life Protector', policyStartDate: '2024-04-12', currency: 'HKD', sumAssured: '500000', contributionAmount: '4200', contributionFrequency: 'monthly', totalContribution: '50400', contributionTerm: '20 years', contributionMaturityDate: '2044-04-12', coverageEndDate: '2044-04-12', policyOwner: 'Emily Chan', insuredPerson: 'Emily Chan', beneficiary: 'Family', cashValue: '86000', projectedValue: '720000' }]
  },
  {
    id: 'client-david-wong', name: 'David Wong', chineseName: '黃偉明', phone: '+852 9456 7812', email: 'david.wong@email.com',
    idNumber: '', address: 'Kowloon, Hong Kong', occupation: 'Business Owner', notes: '',
    createdAt: '2026-07-28', updatedAt: '2026-07-28',
    policies: [{ id: 'policy-david-1', coverageType: '投資 / Investment', company: 'Manulife', policyNumber: 'M-2001', policyName: 'Investment Linked Plan', policyStartDate: '2022-09-01', currency: 'USD', sumAssured: '150000', contributionAmount: '18000', contributionFrequency: 'annual', totalContribution: '180000', contributionTerm: '10 years', contributionMaturityDate: '2032-09-01', coverageEndDate: '', policyOwner: 'David Wong', insuredPerson: 'David Wong', beneficiary: 'Spouse', cashValue: '96000', projectedValue: '250000' }]
  },
  {
    id: 'client-sarah-li', name: 'Sarah Li', chineseName: '李思晴', phone: '+852 9876 1234', email: 'sarah.li@email.com',
    idNumber: '', address: 'Central, Hong Kong', occupation: 'Designer', notes: '',
    createdAt: '2026-07-25', updatedAt: '2026-07-25',
    policies: [{ id: 'policy-sarah-1', coverageType: '醫療 / Medical', company: 'Manulife', policyNumber: 'M-3001', policyName: 'Medical Care', policyStartDate: '2025-01-05', currency: 'HKD', sumAssured: '1000000', contributionAmount: '6800', contributionFrequency: 'annual', totalContribution: '6800', contributionTerm: '1 year', contributionMaturityDate: '2026-01-05', coverageEndDate: '2026-01-05', policyOwner: 'Sarah Li', insuredPerson: 'Sarah Li', beneficiary: '', cashValue: '', projectedValue: '' }]
  },
  {
    id: 'client-marcus-ho', name: 'Marcus Ho', chineseName: '何俊賢', phone: '+852 9234 8765', email: 'marcus.ho@email.com',
    idNumber: '', address: 'Sai Kung, Hong Kong', occupation: 'Engineer', notes: '',
    createdAt: '2026-07-19', updatedAt: '2026-07-19', policies: []
  }
];

const seedReports = [
  {
    id: 'report-david-1', clientId: 'client-david-wong', date: '2026-07-28', topic: 'Portfolio review', status: 'Complete',
    discussion: 'Reviewed current investment allocation and discussed the upcoming policy anniversary.',
    situation: 'Client is preparing for a business expansion and wants to keep liquidity available.',
    recommendations: 'Prepare a contribution and liquidity comparison before the next meeting.',
    actions: 'Advisor to prepare the comparison; client to provide updated cash-flow figures.', followup: '2026-08-04',
    createdAt: '2026-07-28T09:00:00', updatedAt: '2026-07-28T09:00:00', attachments: []
  },
  {
    id: 'report-sarah-1', clientId: 'client-sarah-li', date: '2026-07-25', topic: 'Insurance discussion', status: 'Complete',
    discussion: 'Discussed medical coverage and the protection needs created by a recent job change.',
    situation: 'Client is reviewing employer benefits and would like a personal medical backup.',
    recommendations: 'Compare medical plan limits and exclusions for the next review.',
    actions: 'Client to send the existing employer benefit summary.', followup: '2026-08-07',
    createdAt: '2026-07-25T10:00:00', updatedAt: '2026-07-25T10:00:00', attachments: []
  }
];

const emptyPolicy = () => ({
  id: uid('policy'), currency: 'HKD', coverageType: '', company: '', policyNumber: '', policyName: '', policyStartDate: '',
  sumAssured: '', contributionAmount: '', contributionFrequency: 'monthly', totalContribution: '', contributionTerm: '',
  contributionMaturityDate: '', coverageEndDate: '', policyOwner: '', insuredPerson: '', beneficiary: '', cashValue: '', projectedValue: '', notes: ''
});

function uid(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function readStorage(key) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    if (value) return JSON.parse(value);
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
  }
  const fallback = memoryStorage.get(key);
  return fallback ? JSON.parse(fallback) : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function initials(name) {
  const value = String(name || 'C').trim();
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return Array.from(value).slice(0, 2).join('').toUpperCase();
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateKey(value) {
  const date = parseDateValue(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(value) {
  if (!value) return '未設定 / Not set';
  const date = parseDateValue(value);
  if (!date) return String(value);
  const zh = new Intl.DateTimeFormat('zh-Hant-HK', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  const en = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
  return `${zh} / ${en}`;
}

function formatDateShort(value) {
  const date = parseDateValue(value);
  return date ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }).format(date) : (value || '—');
}

function formatDateRelative(value) {
  const key = dateKey(value);
  if (!key) return value || '—';
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  if (key === today) return '今天 / Today';
  if (key === yesterday) return '昨天 / Yesterday';
  return formatDateShort(value);
}

function displayClientName(client) {
  return [client?.chineseName, client?.name].filter(Boolean).join(' / ') || '未命名客戶 / Untitled client';
}

function selectedAttribute(selected, value) {
  return String(selected || '') === String(value || '') ? ' selected' : '';
}

function hasPolicyValue(policy) {
  return ['coverageType', 'company', 'policyNumber', 'policyName', 'policyStartDate', 'sumAssured', 'contributionAmount', 'totalContribution', 'contributionTerm', 'contributionMaturityDate', 'coverageEndDate', 'policyOwner', 'insuredPerson', 'beneficiary', 'cashValue', 'projectedValue', 'notes'].some(key => String(policy?.[key] || '').trim());
}

function normalisePolicy(raw = {}, index = 0) {
  let contributionAmount = raw.contributionAmount || '';
  let contributionFrequency = raw.contributionFrequency || 'monthly';
  if (!contributionAmount) {
    if (raw.monthlyContribution) { contributionAmount = raw.monthlyContribution; contributionFrequency = 'monthly'; }
    else if (raw.annualContribution) { contributionAmount = raw.annualContribution; contributionFrequency = 'annual'; }
    else if (raw.lumpSumContribution) { contributionAmount = raw.lumpSumContribution; contributionFrequency = 'lump-sum'; }
  }
  return {
    ...emptyPolicy(), ...raw, id: raw.id || uid(`policy-${index}`), contributionAmount, contributionFrequency,
    currency: raw.currency || 'HKD'
  };
}

function legacyPolicy(raw) {
  const fields = ['coverageType', 'company', 'policyNumber', 'policyName', 'policyStartDate', 'sumAssured', 'currency', 'monthlyContribution', 'annualContribution', 'lumpSumContribution', 'totalContribution', 'contributionTerm', 'coverageEndDate', 'contributionMaturityDate', 'policyOwner', 'insuredPerson', 'beneficiary', 'cashValue', 'projectedValue'];
  return fields.reduce((result, field) => {
    if (raw?.[field]) result[field] = raw[field];
    return result;
  }, {});
}

function normaliseClient(raw = {}, index = 0) {
  const name = String(raw.name || raw.englishName || '').trim() || '未命名客戶 / Untitled client';
  const rawPolicies = Array.isArray(raw.policies) ? raw.policies : (hasPolicyValue(legacyPolicy(raw)) ? [legacyPolicy(raw)] : []);
  return {
    ...raw,
    id: raw.id || uid(`client-${index}`), name, chineseName: raw.chineseName || '', phone: raw.phone || '', email: raw.email || '',
    idNumber: raw.idNumber || '', address: raw.address || '', occupation: raw.occupation || raw.role || '', notes: raw.notes || '',
    createdAt: raw.createdAt || raw.updatedAt || todayIso(), updatedAt: raw.updatedAt || raw.createdAt || todayIso(),
    policies: rawPolicies.map((policy, policyIndex) => normalisePolicy(policy, policyIndex))
  };
}

function normaliseAttachment(raw = {}, index = 0) {
  return { id: raw.id || uid(`attachment-${index}`), name: raw.name || `photo-${index + 1}.jpg`, data: raw.data || '' };
}

function normaliseReport(raw = {}, index = 0, clientList = []) {
  const linkedClient = raw.clientId ? clientList.find(client => client.id === raw.clientId) : clientList.find(client => client.name === raw.client || client.chineseName === raw.client);
  const reportId = raw.id || uid(`report-${index}`);
  return {
    ...raw, id: reportId, clientId: linkedClient?.id || raw.clientId || '', date: raw.date || '', topic: raw.topic || '',
    status: raw.status || 'Draft', discussion: raw.discussion || '', situation: raw.situation || raw.clientSituation || '',
    recommendations: raw.recommendations || '', actions: raw.actions || '', followup: raw.followup || '',
    createdAt: raw.createdAt || todayIso(), updatedAt: raw.updatedAt || raw.createdAt || todayIso(),
    pdfFileName: raw.pdfFileName || '', attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normaliseAttachment) : []
  };
}

const storedClients = readStorage(CLIENTS_KEY);
const legacyClients = readStorage(LEGACY_CLIENTS_KEY);
const usingSeedData = !Array.isArray(storedClients) && !Array.isArray(legacyClients);
let clients = (Array.isArray(storedClients) ? storedClients : (Array.isArray(legacyClients) ? legacyClients : seedClients)).map(normaliseClient);
const storedReports = readStorage(REPORTS_KEY);
const legacyReports = readStorage(LEGACY_REPORTS_KEY);
let reports = (Array.isArray(storedReports) ? storedReports : (Array.isArray(legacyReports) ? legacyReports : (usingSeedData ? seedReports : []))).map((report, index) => normaliseReport(report, index, clients));

let currentClientFilter = 'all';
let searchTerm = '';
let coverageFilter = '';
let currencyFilter = '';
let activeClientId = '';
let currentAttachments = [];
let pendingAttachments = [];
let pdfFontBytesPromise;

function persist() {
  const records = [[CLIENTS_KEY, clients], [REPORTS_KEY, reports]];
  records.forEach(([key, value]) => {
    const serialised = JSON.stringify(value);
    memoryStorage.set(key, serialised);
    try {
      globalThis.localStorage?.setItem(key, serialised);
    } catch (error) {
      console.warn(`Unable to persist ${key}`, error);
    }
  });
}

function getClient(clientId) {
  return clients.find(client => client.id === clientId);
}

function getClientReports(clientId) {
  return reports.filter(report => report.clientId === clientId).sort((a, b) => dateKey(b.date || b.updatedAt).localeCompare(dateKey(a.date || a.updatedAt)) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function getUpcomingBookings() {
  const today = dateKey(new Date());
  return reports
    .filter(report => report.followup && dateKey(report.followup) && dateKey(report.followup) >= today)
    .map(report => ({ report, client: getClient(report.clientId) }))
    .filter(item => item.client)
    .sort((a, b) => dateKey(a.report.followup).localeCompare(dateKey(b.report.followup)));
}

function reportCountThisMonth() {
  const now = new Date();
  return reports.filter(report => {
    const date = parseDateValue(report.date || report.createdAt);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
}

function formatMoney(value, currency) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const clean = String(value).trim()
    .replace(/^\$\s*/, '')
    .replace(/\s+\$\s*(?:[A-Z]{3}|其他\s*\/\s*Other)\s*$/i, '')
    .replace(/\s+(?:[A-Z]{3}|其他\s*\/\s*Other)\s*$/i, '');
  return `$${clean} ${currency || 'HKD'}`;
}

function frequencyLabel(value) {
  return CONTRIBUTION_FREQUENCIES.find(item => item[0] === value)?.[1] || value || '—';
}

function policyMarkup(policy = emptyPolicy(), index = 0, total = 1) {
  const p = normalisePolicy(policy, index);
  const coverageOptions = `<option value="">請選擇 / Select a type</option>${COVERAGE_TYPES.map(option => `<option${selectedAttribute(p.coverageType, option)}>${escapeHtml(option)}</option>`).join('')}`;
  const frequencyOptions = CONTRIBUTION_FREQUENCIES.map(([value, label]) => `<option value="${value}"${selectedAttribute(p.contributionFrequency, value)}>${label}</option>`).join('');
  const currencyOptions = ['HKD', 'USD', 'CNY', '其他 / Other'].map(option => `<option value="${option}"${selectedAttribute(p.currency, option)}>${option}</option>`).join('');
  const input = (field, label, english, type = 'text', extra = '') => `<label>${label}<small>${english}</small><input data-field="${field}" type="${type}" value="${escapeHtml(p[field])}" ${extra}></label>`;
  return `<article class="policy-card" data-policy-index="${index}">
    <div class="policy-card-heading"><div><h3>保單 ${index + 1} <span>Policy ${index + 1}</span></h3><p>貨幣先行，金額會顯示為 $1000 USD。<span>Amounts appear as $1000 USD.</span></p></div>${total > 1 ? `<button type="button" class="remove-link" data-action="remove-policy" data-policy-index="${index}">移除 / Remove</button>` : ''}</div>
    <div class="form-grid policy-grid">
      <label>貨幣 <small>Currency</small><select data-field="currency">${currencyOptions}</select></label>
      <label>保障類別 <small>Coverage type</small><select data-field="coverageType">${coverageOptions}</select></label>
      ${input('company', '保險公司', 'Insurer / Company')}
      ${input('policyNumber', '保單編號', 'Policy number')}
      ${input('policyName', '保單名稱', 'Policy name')}
      ${input('policyStartDate', '保單生效日期', 'Policy effective date', 'date')}
      ${input('sumAssured', '保障額', 'Sum assured', 'text', 'inputmode="decimal"')}
      ${input('contributionAmount', '供款額', 'Contribution amount', 'text', 'inputmode="decimal"')}
      <label>供款頻率 <small>Contribution frequency</small><select data-field="contributionFrequency">${frequencyOptions}</select></label>
      ${input('totalContribution', '供款總額', 'Total contribution', 'text', 'inputmode="decimal"')}
      ${input('contributionTerm', '供款年期', 'Contribution term')}
      ${input('contributionMaturityDate', '供款到期日', 'Contribution maturity date', 'date')}
      ${input('coverageEndDate', '保障到期日', 'Coverage maturity date', 'date')}
      ${input('policyOwner', '保單持有人', 'Policy owner')}
      ${input('insuredPerson', '受保人', 'Life insured')}
      ${input('beneficiary', '受益人', 'Beneficiary')}
      ${input('cashValue', '現金價值', 'Cash value', 'text', 'inputmode="decimal"')}
      ${input('projectedValue', '預計價值', 'Projected value', 'text', 'inputmode="decimal"')}
      ${input('notes', '保單備註', 'Policy notes')}
    </div>
  </article>`;
}

function renderPolicyList(policies = []) {
  const values = policies.length ? policies : [emptyPolicy()];
  $('#policy-list').innerHTML = values.map((policy, index) => policyMarkup(policy, index, values.length)).join('');
  $('#policy-count').textContent = `${values.length} ${values.length === 1 ? 'policy' : 'policies'} / ${values.length === 1 ? '張保單' : '張保單'}`;
}

function collectPolicies() {
  return $$('.policy-card').map(card => {
    const policy = { id: uid('policy') };
    $$('[data-field]', card).forEach(field => { policy[field.dataset.field] = field.value.trim(); });
    return normalisePolicy(policy);
  }).filter(hasPolicyValue);
}

function renderOverview() {
  const date = new Date();
  const zh = new Intl.DateTimeFormat('zh-Hant-HK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  const en = new Intl.DateTimeFormat('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  $('#today-label').textContent = `${zh} / ${en}`;
  $('#stat-total-clients').textContent = clients.length;
  $('#stat-month-reports').textContent = reportCountThisMonth();
  $('#stat-followups').textContent = getUpcomingBookings().length;
  $('#all-client-count').textContent = clients.length;

  const recent = [...clients].sort((a, b) => dateKey(b.updatedAt || b.createdAt).localeCompare(dateKey(a.updatedAt || a.createdAt))).slice(0, 4);
  $('#recent-list').innerHTML = recent.length ? recent.map(clientCompactMarkup).join('') : emptyState('尚未有客戶資料 / No client records yet.');

  const upcoming = getUpcomingBookings().slice(0, 3);
  $('#upcoming-list').innerHTML = upcoming.length ? upcoming.map(upcomingCompactMarkup).join('') : emptyState('尚未有即將到期的跟進 / No upcoming follow-ups.');
}

function clientCompactMarkup(client) {
  return `<button class="client-row client-link" data-client-id="${escapeHtml(client.id)}" type="button"><span class="client-avatar">${escapeHtml(initials(client.name || client.chineseName))}</span><span><strong>${escapeHtml(client.chineseName || client.name)}</strong><small>${escapeHtml(client.name || '未有英文姓名 / No English name')}</small></span><time>${escapeHtml(formatDateRelative(client.updatedAt || client.createdAt))}</time></button>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function clientMatches(client) {
  const policyText = client.policies.flatMap(policy => Object.values(policy)).join(' ');
  const searchText = [client.name, client.chineseName, client.phone, client.email, client.idNumber, client.address, client.occupation, policyText].join(' ').toLowerCase();
  if (searchTerm && !searchText.includes(searchTerm)) return false;
  if (coverageFilter && !client.policies.some(policy => policy.coverageType === coverageFilter)) return false;
  if (currencyFilter && !client.policies.some(policy => policy.currency === currencyFilter)) return false;
  if (currentClientFilter === 'recent') {
    const created = parseDateValue(client.createdAt);
    const threshold = new Date(); threshold.setDate(threshold.getDate() - 30);
    if (!created || created < threshold) return false;
  }
  if (currentClientFilter === 'followup' && !getUpcomingBookings().some(item => item.report.clientId === client.id)) return false;
  return true;
}

function clientRowMarkup(client) {
  const reportTotal = getClientReports(client.id).length;
  return `<div class="client-table-row client-link" data-client-id="${escapeHtml(client.id)}" tabindex="0" role="button">
    <div class="table-client"><span class="client-avatar">${escapeHtml(initials(client.name || client.chineseName))}</span><span><span class="table-name">${escapeHtml(client.chineseName || client.name)}</span><small>${escapeHtml(client.name || '未有英文姓名 / No English name')}</small></span></div>
    <span class="table-contact"><span>電話 / Phone: ${escapeHtml(client.phone || '—')}</span><small>電郵 / Email: ${escapeHtml(client.email || '—')}</small></span>
    <span class="table-muted">${escapeHtml(formatDateRelative(client.updatedAt || client.createdAt))}</span>
    <span class="table-reports">${reportTotal}</span>
    <span class="row-actions"><button class="delete-action" type="button" data-action="delete-client" data-client-id="${escapeHtml(client.id)}" title="刪除客戶 / Delete client">刪除 / Delete</button></span>
  </div>`;
}

function renderFilterOptions() {
  const selected = coverageFilter;
  const values = [...new Set(clients.flatMap(client => client.policies.map(policy => policy.coverageType).filter(Boolean)))].sort();
  $('#filter-coverage').innerHTML = `<option value="">全部保障類別 / All types</option>${values.map(value => `<option value="${escapeHtml(value)}"${selectedAttribute(selected, value)}>${escapeHtml(value)}</option>`).join('')}`;
}

function renderClients() {
  renderFilterOptions();
  const visibleClients = clients.filter(clientMatches);
  $('#recent-list').innerHTML = [...clients].sort((a, b) => dateKey(b.updatedAt || b.createdAt).localeCompare(dateKey(a.updatedAt || a.createdAt))).slice(0, 4).map(clientCompactMarkup).join('') || emptyState('尚未有客戶資料 / No client records yet.');
  $('#client-table').innerHTML = visibleClients.length ? visibleClients.map(clientRowMarkup).join('') : emptyState('找不到符合條件的客戶。 / No matching client records.');
  $('#all-client-count').textContent = clients.length;
  $$('.chip[data-client-filter]').forEach(chip => chip.classList.toggle('selected', chip.dataset.clientFilter === currentClientFilter));
  renderReportClientOptions($('#report-client')?.value || '');
}

function renderReportClientOptions(selected = '') {
  const select = $('#report-client');
  if (!select) return;
  select.innerHTML = `<option value="">請選擇客戶 / Choose a client</option>${clients.map(client => `<option value="${escapeHtml(client.id)}"${selectedAttribute(selected, client.id)}>${escapeHtml(displayClientName(client))}</option>`).join('')}`;
}

function bookingTitle(report) {
  return report.topic || String(report.discussion || '').split(/\r?\n/)[0].slice(0, 60) || '跟進會面 / Follow-up';
}

function upcomingCompactMarkup(item) {
  const date = parseDateValue(item.report.followup);
  const day = date ? String(date.getDate()).padStart(2, '0') : '—';
  const month = date ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase() : '—';
  return `<button type="button" class="followup" data-action="edit-report" data-report-id="${escapeHtml(item.report.id)}"><span class="date-block"><b>${day}</b><small>${month}</small></span><span><strong>${escapeHtml(displayClientName(item.client))}</strong><p>${escapeHtml(bookingTitle(item.report))}</p></span><span class="arrow">→</span></button>`;
}

function renderCalendar() {
  const bookings = getUpcomingBookings();
  $('#calendar-list').innerHTML = bookings.length ? bookings.map(item => `<div class="client-table-row calendar-row">
    <span class="table-muted">${escapeHtml(formatDateDisplay(item.report.followup))}</span>
    <span class="table-name">${escapeHtml(displayClientName(item.client))}</span>
    <span class="table-muted">${escapeHtml(bookingTitle(item.report))}</span>
    <span><span class="status-pill ${item.report.status === 'Complete' ? 'complete' : 'draft'}">${item.report.status === 'Complete' ? '完成 / Complete' : '草稿 / Draft'}</span></span>
    <button class="icon-action" type="button" data-action="edit-report" data-report-id="${escapeHtml(item.report.id)}">查看 / Edit</button>
  </div>`).join('') : emptyState('尚未有即將到來的預約。請在會面報告加入下次跟進日期。 / No upcoming bookings. Add a follow-up date in a meeting report.');
}

function detailRow(label, value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  return `<div class="detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function policyDetailMarkup(policy, index) {
  const rows = [
    ['貨幣 / Currency', policy.currency],
    ['保障類別 / Coverage type', policy.coverageType],
    ['保險公司 / Insurer', policy.company],
    ['保單編號 / Policy number', policy.policyNumber],
    ['保單名稱 / Policy name', policy.policyName],
    ['生效日期 / Effective date', formatDateDisplay(policy.policyStartDate)],
    ['保障額 / Sum assured', formatMoney(policy.sumAssured, policy.currency)],
    ['供款額 / Contribution', `${formatMoney(policy.contributionAmount, policy.currency)}${policy.contributionAmount ? ` · ${frequencyLabel(policy.contributionFrequency)}` : ''}`],
    ['供款總額 / Total contribution', formatMoney(policy.totalContribution, policy.currency)],
    ['供款年期 / Contribution term', policy.contributionTerm],
    ['供款到期日 / Contribution maturity', formatDateDisplay(policy.contributionMaturityDate)],
    ['保障到期日 / Coverage maturity', formatDateDisplay(policy.coverageEndDate)],
    ['保單持有人 / Policy owner', policy.policyOwner],
    ['受保人 / Life insured', policy.insuredPerson],
    ['受益人 / Beneficiary', policy.beneficiary],
    ['現金價值 / Cash value', formatMoney(policy.cashValue, policy.currency)],
    ['預計價值 / Projected value', formatMoney(policy.projectedValue, policy.currency)],
    ['備註 / Notes', policy.notes]
  ].filter(([, value]) => value && String(value).trim() && value !== '未設定 / Not set');
  return `<article class="policy-detail"><div class="policy-detail-heading"><h3>保單 ${index + 1} <span>Policy ${index + 1}</span></h3><span class="coverage-badge">${escapeHtml(policy.coverageType || '其他 / Others')}</span></div><dl>${rows.map(([label, value]) => detailRow(label, value)).join('')}</dl></article>`;
}

function reportDetailMarkup(report) {
  const attachmentLabel = report.attachments?.length ? ` · ${report.attachments.length} 張相片 / photo${report.attachments.length === 1 ? '' : 's'}` : '';
  return `<article class="report-detail"><div class="report-detail-heading"><div><h3>${escapeHtml(report.topic || '會面報告 / Meeting report')}</h3><p>${escapeHtml(formatDateDisplay(report.date))} · ${escapeHtml(report.status === 'Complete' ? '完成 / Complete' : '草稿 / Draft')}${attachmentLabel}</p></div><div class="inline-actions"><button class="text-button" type="button" data-action="edit-report" data-report-id="${escapeHtml(report.id)}">編輯 / Edit</button><button class="text-button" type="button" data-action="download-report" data-report-id="${escapeHtml(report.id)}">下載 PDF / Download</button></div></div><dl>${detailRow('討論內容 / Discussion', report.discussion)}${detailRow('客戶目前情況 / Client situation', report.situation)}${detailRow('需要及建議 / Needs and recommendations', report.recommendations)}${detailRow('已同意的行動 / Actions agreed', report.actions)}${detailRow('下次跟進 / Follow-up', formatDateDisplay(report.followup))}</dl></article>`;
}

function renderClientDetail(clientId = activeClientId) {
  const client = getClient(clientId);
  if (!client) { go('clients'); return; }
  activeClientId = client.id;
  const clientReports = getClientReports(client.id);
  const lastMeeting = clientReports[0];
  const lastReportDate = clientReports[0]?.updatedAt || clientReports[0]?.createdAt;
  const policies = client.policies || [];
  $('#client-detail-content').innerHTML = `<div class="detail-heading"><button class="back" data-go="clients" aria-label="返回客戶 / Back to clients">←</button><div class="detail-title"><p class="eyebrow">客戶資料 / Client record</p><h1>${escapeHtml(client.chineseName || client.name)}<span class="heading-en">${escapeHtml(client.name || '')}</span></h1><p class="subtext">${escapeHtml(client.occupation || '客戶 / Client')}</p></div><div class="detail-actions"><button class="primary" type="button" data-action="new-report" data-client-id="${escapeHtml(client.id)}">＋ 新增會面報告 <span>New report</span></button></div></div>
    <div class="detail-summary-grid">
      <article class="card"><h2>基本資料 <span>Basic information</span></h2><dl>${detailRow('英文姓名 / English name', client.name)}${detailRow('中文姓名 / Chinese name', client.chineseName)}${detailRow('電話 / Telephone', client.phone)}${detailRow('電郵 / Email', client.email)}${detailRow('身份證號碼 / HKID', client.idNumber)}${detailRow('住址 / Address', client.address)}${detailRow('職業 / Occupation', client.occupation)}</dl></article>
      <article class="card"><h2>記錄摘要 <span>Record summary</span></h2><dl>${detailRow('最近會面 / Last meeting', lastMeeting ? formatDateDisplay(lastMeeting.date) : '未有記錄 / No meeting yet')}${detailRow('最近報告輸入 / Last report saved', lastReportDate ? formatDateDisplay(lastReportDate) : '未有報告 / No report yet')}${detailRow('保單數量 / Policies', String(policies.length))}${detailRow('會面報告 / Meeting reports', String(clientReports.length))}</dl>${client.notes ? `<div class="detail-note"><strong>備註 / Notes</strong><p>${escapeHtml(client.notes)}</p></div>` : ''}</article>
    </div>
    <article class="card detail-section"><div class="card-title"><div><h2>現有保單 <span>Existing policies</span></h2><p>這些保單會在同一份客戶 PDF 內。<span>All policies are included in one client PDF.</span></p></div><button class="outline" type="button" data-action="download-client" data-client-id="${escapeHtml(client.id)}">下載保單 PDF <span>Download policy PDF</span></button></div>${policies.length ? policies.map(policyDetailMarkup).join('') : emptyState('尚未輸入保單資料 / No policy details entered yet.')}</article>
    <article class="card detail-section"><div class="card-title"><div><h2>會面報告 <span>Meeting reports</span></h2><p>每份報告都可重新開啟、修改及下載。<span>Reopen, edit and download any report.</span></p></div><button class="text-button" type="button" data-action="new-report" data-client-id="${escapeHtml(client.id)}">＋ 新增記錄 / Add record</button></div>${clientReports.length ? clientReports.map(reportDetailMarkup).join('') : emptyState('尚未有會面報告 / No meeting reports yet.')}</article>`;
}

function setReportTitle(editing) {
  $('#report-page-title').innerHTML = editing ? '編輯會面報告 <span class="heading-en">Edit meeting report</span>' : '新增會面報告 <span class="heading-en">New meeting report</span>';
}

function renderAttachmentEditors() {
  $('#existing-attachments').innerHTML = currentAttachments.length ? `<p class="attachment-heading">已附加相片 / Attached photos</p><div class="attachment-list">${currentAttachments.map(attachment => `<div class="attachment-item"><img src="${attachment.data}" alt="${escapeHtml(attachment.name)}"><span>${escapeHtml(attachment.name)}</span><button type="button" class="remove-link" data-action="remove-attachment" data-attachment-id="${escapeHtml(attachment.id)}">移除 / Remove</button></div>`).join('')}</div>` : '';
  $('#photo-preview').innerHTML = pendingAttachments.length ? `<p class="attachment-heading">準備加入 / Ready to add</p><div class="attachment-list">${pendingAttachments.map(attachment => `<div class="attachment-item"><img src="${attachment.data}" alt="${escapeHtml(attachment.name)}"><span>${escapeHtml(attachment.name)}</span></div>`).join('')}</div>` : '';
}

function resetReportForm(clientId = '') {
  const form = $('#report-form');
  form.reset();
  $('#report-id').value = '';
  renderReportClientOptions(clientId);
  $('#report-client').value = clientId || '';
  form.elements.date.value = todayIso();
  form.elements.status.value = 'Draft';
  currentAttachments = [];
  pendingAttachments = [];
  setReportTitle(false);
  renderAttachmentEditors();
}

function openNewReport(clientId = '') {
  resetReportForm(clientId);
  go('reports');
  $('#report-client').focus({ preventScroll: true });
}

function openReportForEdit(reportId) {
  const report = reports.find(item => item.id === reportId);
  if (!report) return;
  const form = $('#report-form');
  form.reset();
  renderReportClientOptions(report.clientId);
  $('#report-id').value = report.id;
  form.elements.clientId.value = report.clientId;
  form.elements.date.value = report.date || '';
  form.elements.topic.value = report.topic || '';
  form.elements.status.value = report.status || 'Draft';
  form.elements.discussion.value = report.discussion || '';
  form.elements.situation.value = report.situation || '';
  form.elements.recommendations.value = report.recommendations || '';
  form.elements.actions.value = report.actions || '';
  form.elements.followup.value = report.followup || '';
  currentAttachments = (report.attachments || []).map(normaliseAttachment);
  pendingAttachments = [];
  setReportTitle(true);
  renderAttachmentEditors();
  go('reports');
}

function resetClientForm() {
  $('#client-form').reset();
  renderPolicyList([]);
}

function go(page) {
  const validPages = ['home', 'clients', 'new-client', 'reports', 'calendar', 'client-detail'];
  const target = validPages.includes(page) ? page : 'home';
  $$('.page').forEach(section => section.classList.toggle('active', section.id === target));
  $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === target));
  const crumbs = { home: '總覽 / Overview', clients: '客戶 / Clients', 'new-client': '新增客戶 / Add client', reports: '會面報告 / Meeting reports', calendar: '日程 / Calendar', 'client-detail': '客戶記錄 / Client record' };
  $('#crumb').textContent = crumbs[target];
  if (target === 'calendar') renderCalendar();
  if (target === 'client-detail') renderClientDetail();
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saved(message, duration = 3200) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(saved.timer);
  saved.timer = window.setTimeout(() => toast.classList.remove('show'), duration);
}

function setPdfBusy(form, busy) {
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  if (busy) {
    if (!submit.dataset.originalLabel) submit.dataset.originalLabel = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = '正在產生 PDF... <span>Preparing PDF...</span>';
    form.setAttribute('aria-busy', 'true');
  } else {
    submit.disabled = false;
    if (submit.dataset.originalLabel) submit.innerHTML = submit.dataset.originalLabel;
    form.removeAttribute('aria-busy');
  }
}

function setMobileNavState(open) {
  const sidebar = $('#sidebar');
  const isMobile = window.matchMedia('(max-width: 800px)').matches;
  sidebar.classList.toggle('open', open);
  $('#mobile-backdrop').classList.toggle('show', open);
  $('#mobile-menu').setAttribute('aria-expanded', String(open));
  sidebar.setAttribute('aria-hidden', String(isMobile && !open));
  if ('inert' in sidebar) sidebar.inert = isMobile && !open;
}

function closeMobileNav() {
  setMobileNavState(false);
}

function toggleMobileNav() {
  setMobileNavState(!$('#sidebar').classList.contains('open'));
}

function openHelp() {
  $('#help-modal').hidden = false;
}

function closeHelp() {
  $('#help-modal').hidden = true;
}

function filteredClientSearch() {
  searchTerm = $('#client-search').value.trim().toLowerCase();
  renderClients();
}

function removePolicy(index) {
  const cards = $$('.policy-card');
  if (cards.length <= 1) { saved('至少保留一個空白保單項目 / Keep one empty policy card.'); return; }
  const values = cards.map(card => {
    const policy = { id: uid('policy') };
    $$('[data-field]', card).forEach(field => { policy[field.dataset.field] = field.value.trim(); });
    return policy;
  });
  values.splice(index, 1);
  renderPolicyList(values);
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Unable to read image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Unable to load image'));
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function splitFontRuns(text) {
  const runs = [];
  let current = '';
  let currentCjk = null;
  for (const character of Array.from(String(text ?? ''))) {
    const isCjk = /[^\x00-\x7F]/.test(character);
    if (current && isCjk !== currentCjk) { runs.push({ text: current, cjk: currentCjk }); current = ''; }
    current += character;
    currentCjk = isCjk;
  }
  if (current) runs.push({ text: current, cjk: currentCjk });
  return runs;
}

function mixedWidth(text, fonts, size) {
  return splitFontRuns(text).reduce((width, run) => width + (run.cjk ? fonts.cjk : fonts.times).widthOfTextAtSize(run.text, size), 0);
}

function wrapMixed(text, maxWidth, fonts, size) {
  const lines = [];
  for (const paragraph of String(text ?? '').split(/\r?\n/)) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const character of Array.from(paragraph)) {
      const candidate = line + character;
      if (line && mixedWidth(candidate, fonts, size) > maxWidth) {
        lines.push(line.trimEnd());
        line = character.trim() ? character : '';
      } else {
        line = candidate;
      }
    }
    if (line || !lines.length) lines.push(line.trimEnd());
  }
  return lines.length ? lines : [''];
}

function drawMixedText(page, text, x, y, size, fonts, color = rgb(0.12, 0.17, 0.14)) {
  let cursor = x;
  for (const run of splitFontRuns(text)) {
    const font = run.cjk ? fonts.cjk : fonts.times;
    page.drawText(run.text, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(run.text, size);
  }
  return cursor;
}

class PdfWriter {
  constructor(pdf, fonts) {
    this.pdf = pdf;
    this.fonts = fonts;
    this.pages = [];
    this.width = 595;
    this.height = 842;
    this.margin = 52;
    this.y = 0;
    this.page = null;
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage([this.width, this.height]);
    this.pages.push(this.page);
    this.y = 786;
  }

  ensure(space = 24) {
    if (this.y - space < 58) this.newPage();
  }

  text(text, { size = 14, color = rgb(0.12, 0.17, 0.14), x = this.margin, maxWidth = this.width - this.margin * 2, gap = 6 } = {}) {
    const lines = wrapMixed(text, maxWidth, this.fonts, size);
    for (const line of lines) {
      this.ensure(size + gap);
      drawMixedText(this.page, line, x, this.y, size, this.fonts, color);
      this.y -= size + gap;
    }
    return lines.length;
  }

  title(title, subtitle = '') {
    this.ensure(66);
    drawMixedText(this.page, title, this.margin, this.y, 20, this.fonts, rgb(0.12, 0.24, 0.18));
    this.y -= 29;
    if (subtitle) this.text(subtitle, { size: 10, color: rgb(0.39, 0.46, 0.42), gap: 7 });
    this.y -= 10;
  }

  section(title) {
    this.ensure(36);
    this.page.drawRectangle({ x: 48, y: this.y - 5, width: 499, height: 24, color: rgb(0.91, 0.95, 0.92) });
    drawMixedText(this.page, title, 58, this.y + 2, 14, this.fonts, rgb(0.18, 0.35, 0.27));
    this.y -= 35;
  }

  subheading(title) {
    this.ensure(29);
    drawMixedText(this.page, title, this.margin, this.y, 14, this.fonts, rgb(0.25, 0.35, 0.30));
    this.y -= 23;
  }

  row(label, value) {
    if (value === undefined || value === null || String(value).trim() === '') return;
    const labelLines = wrapMixed(label, this.width - this.margin * 2, this.fonts, 11);
    const valueLines = wrapMixed(String(value), this.width - this.margin * 2, this.fonts, 14);
    const rowHeight = labelLines.length * 14 + valueLines.length * 20 + 10;
    this.ensure(rowHeight);
    labelLines.forEach((line, index) => drawMixedText(this.page, index === 0 ? `${line}:` : line, this.margin, this.y - index * 14, 11, this.fonts, rgb(0.38, 0.45, 0.41)));
    const valueY = this.y - labelLines.length * 14 - 3;
    valueLines.forEach((line, index) => drawMixedText(this.page, line, this.margin, valueY - index * 20, 14, this.fonts, rgb(0.12, 0.17, 0.14)));
    this.y -= rowHeight;
  }

  muted(text) {
    this.text(text, { size: 14, color: rgb(0.45, 0.51, 0.47), gap: 7 });
  }

  footers() {
    this.pages.forEach((page, index) => {
      page.drawLine({ start: { x: this.margin, y: 43 }, end: { x: this.width - this.margin, y: 43 }, thickness: 0.5, color: rgb(0.85, 0.88, 0.85) });
      drawMixedText(page, `Clientfolio · ${index + 1}`, this.margin, 28, 9, this.fonts, rgb(0.45, 0.51, 0.47));
      drawMixedText(page, '資料由本機產生 / Generated locally', 370, 28, 9, this.fonts, rgb(0.45, 0.51, 0.47));
    });
  }
}

async function getPdfFonts(pdf) {
  pdf.registerFontkit(fontkit);
  if (!pdfFontBytesPromise) {
    pdfFontBytesPromise = loadPdfFontBytes().catch(error => {
      pdfFontBytesPromise = undefined;
      throw error;
    });
  }
  const [cjkBytes, times] = await Promise.all([pdfFontBytesPromise, pdf.embedFont(StandardFonts.TimesRoman)]);
  // Deng.ttf is already subsetted for the app's Traditional Chinese text. Running
  // pdf-lib's subsetter a second time drops glyph mappings in some PDF viewers.
  const cjk = await pdf.embedFont(cjkBytes, { subset: false });
  return { cjk, times };
}

function decodeEmbeddedFont(base64) {
  if (!base64 || typeof atob !== 'function') return undefined;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function loadPdfFontBytes() {
  try {
    const embedded = decodeEmbeddedFont(globalThis.__CLIENTFOLIO_FONT_DATA__);
    if (embedded) return Promise.resolve(embedded);
  } catch (error) {
    console.warn('Embedded Chinese font could not be decoded', error);
  }
  if (typeof fetch !== 'function') return Promise.reject(new Error('Chinese font could not be loaded'));
  return fetch('assets/Deng.ttf').then(response => {
    if (!response.ok) throw new Error('Chinese font could not be loaded');
    return response.arrayBuffer();
  });
}

async function createPdfWriter() {
  const pdf = await PDFDocument.create();
  const fonts = await getPdfFonts(pdf);
  return { pdf, writer: new PdfWriter(pdf, fonts), fonts };
}

function clientPdfFilename(client) {
  const base = String(client.name || client.chineseName || 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'client';
  return `${base}-client-profile.pdf`;
}

function reportPdfFilename(report, client) {
  if (report.pdfFileName) return report.pdfFileName;
  const base = String(client?.name || client?.chineseName || 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'client';
  return `${base}-meeting-report-${report.id.slice(-8)}.pdf`;
}

async function savePdf(pdf, filename) {
  const bytes = await pdf.save();
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function writeClientPdf(writer, client) {
  writer.title('客戶資料 / Client profile', `${displayClientName(client)} · ${formatDateDisplay(client.updatedAt || client.createdAt)}`);
  writer.section('基本資料 / Client details');
  [
    ['英文姓名 / English name', client.name], ['中文姓名 / Chinese name', client.chineseName], ['出生日期 / Date of birth', formatDateDisplay(client.birthDate)],
    ['電話 / Telephone', client.phone], ['電郵 / Email', client.email], ['身份證號碼 / HKID / ID', client.idNumber], ['住址 / Address', client.address], ['職業 / Occupation', client.occupation], ['備註 / Notes', client.notes]
  ].forEach(([label, value]) => writer.row(label, value && value !== '未設定 / Not set' ? value : ''));
  writer.section('現有保單 / Existing policies');
  if (!client.policies?.length) writer.muted('尚未輸入保單資料 / No policy details entered.');
  (client.policies || []).forEach((policy, index) => {
    writer.subheading(`保單 ${index + 1} / Policy ${index + 1}`);
    [
      ['貨幣 / Currency', policy.currency], ['保障類別 / Coverage type', policy.coverageType], ['保險公司 / Insurer', policy.company], ['保單編號 / Policy number', policy.policyNumber],
      ['保單名稱 / Policy name', policy.policyName], ['生效日期 / Effective date', formatDateDisplay(policy.policyStartDate)], ['保障額 / Sum assured', formatMoney(policy.sumAssured, policy.currency)],
      ['供款額 / Contribution', policy.contributionAmount ? `${formatMoney(policy.contributionAmount, policy.currency)} · ${frequencyLabel(policy.contributionFrequency)}` : ''],
      ['供款總額 / Total contribution', formatMoney(policy.totalContribution, policy.currency)], ['供款年期 / Contribution term', policy.contributionTerm], ['供款到期日 / Contribution maturity', formatDateDisplay(policy.contributionMaturityDate)],
      ['保障到期日 / Coverage maturity', formatDateDisplay(policy.coverageEndDate)], ['保單持有人 / Policy owner', policy.policyOwner], ['受保人 / Life insured', policy.insuredPerson],
      ['受益人 / Beneficiary', policy.beneficiary], ['現金價值 / Cash value', formatMoney(policy.cashValue, policy.currency)], ['預計價值 / Projected value', formatMoney(policy.projectedValue, policy.currency)], ['備註 / Notes', policy.notes]
    ].forEach(([label, value]) => writer.row(label, value && value !== '未設定 / Not set' ? value : ''));
  });
}

async function downloadClientPdf(client) {
  const { pdf, writer } = await createPdfWriter();
  writeClientPdf(writer, client);
  writer.footers();
  await savePdf(pdf, clientPdfFilename(client));
}

async function downloadMeetingPdf(report, client) {
  const { pdf, writer, fonts } = await createPdfWriter();
  writer.title('會面報告 / Meeting report', `${displayClientName(client)} · ${formatDateDisplay(report.date || report.updatedAt)}`);
  writer.section('會面資料 / Meeting details');
  [['客戶 / Client', displayClientName(client)], ['會面日期 / Meeting date', formatDateDisplay(report.date)], ['會面主題 / Meeting topic', report.topic], ['報告狀態 / Status', report.status === 'Complete' ? '完成 / Complete' : '草稿 / Draft']].forEach(([label, value]) => writer.row(label, value && value !== '未設定 / Not set' ? value : ''));
  writer.section('會面記錄 / Meeting record');
  [['討論內容 / Discussion', report.discussion], ['客戶目前情況 / Client situation', report.situation], ['需要及建議 / Needs and recommendations', report.recommendations]].forEach(([label, value]) => writer.row(label, value));
  writer.section('下一步 / Next steps');
  [['已同意的行動 / Actions agreed', report.actions], ['下次跟進 / Follow-up', formatDateDisplay(report.followup)]].forEach(([label, value]) => writer.row(label, value && value !== '未設定 / Not set' ? value : ''));
  const attachments = (report.attachments || []).filter(attachment => attachment.data?.startsWith('data:image'));
  for (let pageStart = 0; pageStart < attachments.length; pageStart += 3) {
    writer.newPage();
    drawMixedText(writer.page, 'ATTACHED: 相片附件 / Photo attachments', writer.margin, 786, 14, fonts, rgb(0.12, 0.17, 0.14));
    drawMixedText(writer.page, `${displayClientName(client)} · ${formatDateDisplay(report.date || report.updatedAt)}`, writer.margin, 761, 11, fonts, rgb(0.45, 0.51, 0.47));
    let slotTop = 726;
    for (const attachment of attachments.slice(pageStart, pageStart + 3)) {
      try {
        const image = attachment.data.startsWith('data:image/png') ? await pdf.embedPng(attachment.data) : await pdf.embedJpg(attachment.data);
        drawMixedText(writer.page, `ATTACHED: ${attachment.name}`, writer.margin, slotTop, 10, fonts, rgb(0.38, 0.45, 0.41));
        const scale = Math.min(490 / image.width, 178 / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        writer.page.drawImage(image, { x: writer.margin + (490 - width) / 2, y: slotTop - 14 - height, width, height });
      } catch (error) {
        console.warn('Unable to add attachment to PDF', error);
        drawMixedText(writer.page, `ATTACHED: ${attachment.name}`, writer.margin, slotTop, 10, fonts, rgb(0.65, 0.35, 0.30));
        drawMixedText(writer.page, '相片格式未能加入 PDF / Image format could not be embedded', writer.margin, slotTop - 28, 11, fonts, rgb(0.45, 0.51, 0.47));
      }
      slotTop -= 224;
    }
  }
  writer.footers();
  await savePdf(pdf, reportPdfFilename(report, client));
}

async function handleClientSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const name = data.name.trim() || '未命名客戶 / Untitled client';
  const now = nowIso();
  const client = {
    id: uid('client'), name, chineseName: data.chineseName.trim(), birthDate: data.birthDate, phone: data.phone.trim(), email: data.email.trim(),
    idNumber: data.idNumber.trim(), address: data.address.trim(), occupation: data.occupation.trim(), notes: data.notes.trim(),
    createdAt: now, updatedAt: now, policies: collectPolicies()
  };
  clients.unshift(client);
  activeClientId = client.id;
  persist();
  renderAll();
  setPdfBusy(form, true);
  saved('正在產生客戶 PDF... / Preparing client PDF...', 12000);
  try {
    await downloadClientPdf(client);
    saved('客戶已儲存，客戶 PDF 已下載。 / Client saved and PDF downloaded.');
  } catch (error) {
    console.error(error);
    saved('客戶已儲存，但 PDF 下載失敗。請稍後再試。 / Client saved; PDF download failed.');
  } finally {
    setPdfBusy(form, false);
  }
  resetClientForm();
  go('client-detail');
}

async function handleReportSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const client = getClient(data.clientId);
  if (!client) { saved('請先選擇客戶。 / Please choose a client first.'); return; }
  const existing = data.reportId ? reports.find(report => report.id === data.reportId) : null;
  const reportId = existing?.id || uid('report');
  const report = {
    id: reportId, clientId: client.id, date: data.date, topic: data.topic.trim(), status: data.status || 'Draft',
    discussion: data.discussion.trim(), situation: data.situation.trim(), recommendations: data.recommendations.trim(), actions: data.actions.trim(), followup: data.followup,
    createdAt: existing?.createdAt || nowIso(), updatedAt: nowIso(), pdfFileName: existing?.pdfFileName || reportPdfFilename({ id: reportId }, client),
    attachments: [...currentAttachments, ...pendingAttachments]
  };
  if (existing) reports = reports.map(item => item.id === existing.id ? report : item);
  else reports.unshift(report);
  client.updatedAt = report.updatedAt;
  persist();
  renderAll();
  setPdfBusy(form, true);
  saved('正在產生會面 PDF... / Preparing meeting PDF...', 12000);
  try {
    await downloadMeetingPdf(report, client);
    saved(existing ? '會面報告已更新，最新 PDF 已下載。 / Report updated and PDF downloaded.' : '會面報告已儲存，PDF 已下載。 / Report saved and PDF downloaded.');
  } catch (error) {
    console.error(error);
    saved('會面報告已儲存，但 PDF 下載失敗。 / Report saved; PDF download failed.');
  } finally {
    setPdfBusy(form, false);
  }
  activeClientId = client.id;
  currentAttachments = [];
  pendingAttachments = [];
  renderClientDetail(client.id);
  go('client-detail');
}

async function handleDownloadClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  try { await downloadClientPdf(client); saved('客戶 PDF 已下載。 / Client PDF downloaded.'); }
  catch (error) { console.error(error); saved('PDF 下載失敗，請稍後再試。 / PDF download failed.'); }
}

function deleteClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  const confirmed = window.confirm(`確定要刪除 ${displayClientName(client)}？\n\n這會同時刪除該客戶的保單資料及會面報告。\nDelete this client, policies and meeting reports?`);
  if (!confirmed) return;
  clients = clients.filter(item => item.id !== clientId);
  reports = reports.filter(report => report.clientId !== clientId);
  if (activeClientId === clientId) activeClientId = '';
  persist();
  renderAll();
  go('clients');
  saved('客戶及相關報告已刪除。 / Client and linked reports deleted.');
}

async function handleDownloadReport(reportId) {
  const report = reports.find(item => item.id === reportId);
  const client = report && getClient(report.clientId);
  if (!report || !client) return;
  try { await downloadMeetingPdf(report, client); saved('會面報告 PDF 已下載。 / Meeting report PDF downloaded.'); }
  catch (error) { console.error(error); saved('PDF 下載失敗，請稍後再試。 / PDF download failed.'); }
}

function renderAll() {
  renderOverview();
  renderClients();
  renderCalendar();
  if (activeClientId && $('#client-detail').classList.contains('active')) renderClientDetail(activeClientId);
}

document.addEventListener('click', event => {
  const goButton = event.target.closest('[data-go]');
  if (goButton) {
    event.preventDefault();
    const page = goButton.dataset.go;
    if (page === 'new-client') resetClientForm();
    if (page === 'reports') openNewReport();
    else go(page);
    return;
  }

  const action = event.target.closest('[data-action]');
  if (action) {
    event.preventDefault();
    const name = action.dataset.action;
    if (name === 'open-client') { activeClientId = action.dataset.clientId; renderClientDetail(activeClientId); go('client-detail'); }
    if (name === 'download-client') void handleDownloadClient(action.dataset.clientId);
    if (name === 'delete-client') deleteClient(action.dataset.clientId);
    if (name === 'new-report') openNewReport(action.dataset.clientId || '');
    if (name === 'edit-report') openReportForEdit(action.dataset.reportId);
    if (name === 'download-report') void handleDownloadReport(action.dataset.reportId);
    if (name === 'remove-policy') removePolicy(Number(action.dataset.policyIndex));
    if (name === 'remove-attachment') { currentAttachments = currentAttachments.filter(item => item.id !== action.dataset.attachmentId); renderAttachmentEditors(); }
    if (name === 'cancel-report') { if (activeClientId) { renderClientDetail(activeClientId); go('client-detail'); } else go('home'); }
    if (name === 'add-policy') { const values = $$('.policy-card').map(card => { const policy = { id: uid('policy') }; $$('[data-field]', card).forEach(field => { policy[field.dataset.field] = field.value.trim(); }); return policy; }); values.push(emptyPolicy()); renderPolicyList(values); }
    return;
  }

  const row = event.target.closest('.client-link');
  if (row) { activeClientId = row.dataset.clientId; renderClientDetail(activeClientId); go('client-detail'); }
});

document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.client-link')) {
    event.preventDefault(); activeClientId = event.target.dataset.clientId; renderClientDetail(activeClientId); go('client-detail');
  }
});

$$('.nav-link').forEach(link => link.addEventListener('click', () => {
  if (link.dataset.newReport === 'true') openNewReport();
  else go(link.dataset.page);
}));

$('#client-form').addEventListener('submit', handleClientSubmit);
$('#report-form').addEventListener('submit', handleReportSubmit);
$('#add-policy').addEventListener('click', () => {
  const values = $$('.policy-card').map(card => { const policy = { id: uid('policy') }; $$('[data-field]', card).forEach(field => { policy[field.dataset.field] = field.value.trim(); }); return policy; });
  values.push(emptyPolicy());
  renderPolicyList(values);
});

$('#report-attachments').addEventListener('change', async event => {
  const files = [...event.target.files];
  for (const file of files) {
    try { pendingAttachments.push({ id: uid('attachment'), name: file.name, data: await compressImage(file) }); }
    catch (error) { console.error(error); saved(`相片 ${file.name} 未能讀取。 / Could not read ${file.name}.`); }
  }
  event.target.value = '';
  renderAttachmentEditors();
});

$('#client-search').addEventListener('input', filteredClientSearch);
$('#filter-toggle').addEventListener('click', () => {
  const panel = $('#filter-panel');
  panel.hidden = !panel.hidden;
  $('#filter-toggle').setAttribute('aria-expanded', String(!panel.hidden));
});
$('#filter-coverage').addEventListener('change', event => { coverageFilter = event.target.value; renderClients(); });
$('#filter-currency').addEventListener('change', event => { currencyFilter = event.target.value; renderClients(); });
$('#clear-filters').addEventListener('click', () => { coverageFilter = ''; currencyFilter = ''; currentClientFilter = 'all'; renderClients(); });
$$('.chip[data-client-filter]').forEach(chip => chip.addEventListener('click', () => { currentClientFilter = chip.dataset.clientFilter; renderClients(); }));

$('#mobile-menu').addEventListener('click', toggleMobileNav);
$('#mobile-backdrop').addEventListener('click', closeMobileNav);
$('#help-button').addEventListener('click', openHelp);
$('#help-close').addEventListener('click', closeHelp);
$('#help-modal').addEventListener('click', event => { if (event.target === $('#help-modal')) closeHelp(); });
$('#notifications').addEventListener('click', () => saved(`${getUpcomingBookings().length} 個即將跟進 / ${getUpcomingBookings().length} upcoming follow-up${getUpcomingBookings().length === 1 ? '' : 's'}.`));

window.addEventListener('hashchange', () => {
  const page = window.location.hash.replace('#', '');
  if (['home', 'clients', 'new-client', 'reports', 'calendar'].includes(page)) go(page);
});

renderPolicyList([]);
resetReportForm();
renderAll();
const initialPage = window.location.hash.replace('#', '');
if (['home', 'clients', 'new-client', 'reports', 'calendar'].includes(initialPage)) go(initialPage);
closeMobileNav();
if (typeof fetch === 'function' || globalThis.__CLIENTFOLIO_FONT_DATA__) {
  pdfFontBytesPromise = loadPdfFontBytes().catch(() => {
    pdfFontBytesPromise = undefined;
    return undefined;
  });
}
