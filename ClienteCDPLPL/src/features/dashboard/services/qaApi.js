/**
 * QA Platform API Service
 * Connects to the FastAPI QA backend at :8000
 */
import axios from 'axios';

const QA_BASE = 'http://localhost:8000';

const qaHttp = axios.create({ baseURL: QA_BASE, timeout: 60000 });

// ─── Executions ────────────────────────────────────────────────────────────────
export const runSuite = (suite = 'ALL', env = 'local') =>
    qaHttp.post('/executions/run', { suite_type: suite, environment: env });

export const getExecutions = (limit = 20) =>
    qaHttp.get('/executions', { params: { limit } });

export const getLatestExecution = () =>
    qaHttp.get('/executions/latest');

export const getExecution = (id) =>
    qaHttp.get(`/executions/${id}`);

export const getTestResults = (executionId, params = {}) =>
    qaHttp.get(`/executions/${executionId}/results`, { params });

// ─── Metrics ───────────────────────────────────────────────────────────────────
export const getOverviewMetrics = () =>
    qaHttp.get('/metrics/overview');

export const getCoverageMetrics = (executionId) =>
    qaHttp.get('/metrics/coverage', { params: executionId ? { execution_id: executionId } : {} });

export const getPerformanceMetrics = (executionId) =>
    qaHttp.get('/metrics/performance', { params: executionId ? { execution_id: executionId } : {} });

export const getSecurityFindings = (executionId) =>
    qaHttp.get('/metrics/security', { params: executionId ? { execution_id: executionId } : {} });

export const getQualityMetrics = (executionId) =>
    qaHttp.get('/metrics/quality', { params: executionId ? { execution_id: executionId } : {} });

export const getTrends = (days = 30) =>
    qaHttp.get('/metrics/trends', { params: { days } });

// ─── Tests Catalog ────────────────────────────────────────────────────────────
export const getTestsCatalog = (category = '') =>
    qaHttp.get('/tests', { params: category ? { category } : {} });

export const getTestCategories = () =>
    qaHttp.get('/tests/categories');

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getReports = () =>
    qaHttp.get('/reports');

export const getReportJson = (id) =>
    qaHttp.get(`/reports/${id}/json`);

// ─── Evidence ────────────────────────────────────────────────────────────────
export const getEvidence = () =>
    qaHttp.get('/evidence');

// ─── Health ──────────────────────────────────────────────────────────────────
export const checkQAHealth = () =>
    qaHttp.get('/health').then(() => true).catch(() => false);

// ─── SSE Stream ───────────────────────────────────────────────────────────────
export const streamExecution = (executionId, onEvent, onError, onComplete) => {
    const url = `${QA_BASE}/executions/${executionId}/stream`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'complete') {
                onComplete?.(data);
                es.close();
            } else {
                onEvent?.(data);
            }
        } catch { /* ignore parse errors */ }
    };

    es.onerror = (err) => {
        onError?.(err);
        es.close();
    };

    return () => es.close(); // cleanup fn
};
