import { LayoutDashboard, History, Bell, Brain, Sparkles, Gem, Activity } from 'lucide-react';

// ─── Navigation ──────────────────────────────────────────────
export const NAV_ITEMS = [
    { key: 'upload',      label: 'Evaluate',   icon: LayoutDashboard, path: '/app' },
    { key: 'history',     label: 'History',    icon: History,         path: '/app/history' },
    { key: 'monitoring',  label: 'Monitoring', icon: Activity,        path: '/app/monitoring' },
    { key: 'webhooks',    label: 'Webhooks',   icon: Bell,            path: '/app/webhooks' },
];

// ─── Evaluation Strategies ───────────────────────────────────
export const STRATEGIES = [
    { value: 'auto', label: 'Auto (Adaptive routing based on risk)' },
    { value: 'council', label: 'Council (Full 3-judge + aggregator)' },
    { value: 'hybrid', label: 'Hybrid (Deterministic + single judge)' },
    { value: 'single', label: 'Single (Cheapest judge only)' },
];

export const STRATEGY_DESCRIPTIONS = {
    auto: 'Each test case will be routed to the optimal strategy based on its risk score.',
    council: 'All test cases evaluated by 3 judges (OpenAI, Anthropic, Gemini) with statistical majority-vote aggregation.',
    hybrid: 'Deterministic checks + single OpenAI judge. Balanced cost and accuracy.',
    single: 'Gemini judge only. Lowest cost, suitable for simple queries.',
};

export const STRATEGY_STYLE = {
    council: {
        label: 'Council',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
    },
    hybrid: {
        label: 'Hybrid',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
    },
    single: {
        label: 'Single',
        bg: 'bg-surface-tertiary',
        text: 'text-text-secondary',
        border: 'border-surface-border',
        dot: 'bg-text-tertiary',
    },
};

// ─── Judge Configuration ─────────────────────────────────────
export const JUDGE_CONFIG = {
    openai: {
        name: 'OpenAI',
        metric: 'Faithfulness',
        model: 'gpt-4o-mini',
        colorBar: 'bg-openai',
        dot: 'bg-openai',
        pillBg: 'bg-openai-light',
        pillText: 'text-openai',
        spinnerBorder: 'border-t-openai',
        icon: Brain,
    },
    anthropic: {
        name: 'Anthropic',
        metric: 'Groundedness',
        model: 'claude-3-haiku',
        colorBar: 'bg-anthropic',
        dot: 'bg-anthropic',
        pillBg: 'bg-anthropic-light',
        pillText: 'text-anthropic',
        spinnerBorder: 'border-t-anthropic',
        icon: Sparkles,
    },
    gemini: {
        name: 'Gemini',
        metric: 'Context Relevancy',
        model: 'gemini-2.5-flash',
        colorBar: 'bg-gemini',
        dot: 'bg-gemini',
        pillBg: 'bg-gemini-light',
        pillText: 'text-gemini',
        spinnerBorder: 'border-t-gemini',
        icon: Gem,
    },
};

// ─── Deterministic Checks ────────────────────────────────────
export const CHECK_LABELS = {
    entityMatch: 'Entity Match',
    freshness: 'Freshness',
    contextOverlap: 'Context Overlap',
    completeness: 'Completeness',
};

// ─── SSE Event Types ─────────────────────────────────────────
export const SSE_EVENT_TYPES = [
    'connected',
    'evaluation_start',
    'test_case_start',
    'judge_start',
    'judge_complete',
    'judge_error',
    'rate_limited',
    'retry_scheduled',
    'retry_exhausted',
    'aggregator_start',
    'aggregator_complete',
    'aggregator_error',
    'test_case_complete',
    'evaluation_complete',
    'evaluation_error',
    'replay_complete',
    'risk_scored',
    'strategy_selected',
    'deterministic_start',
    'deterministic_complete',
];

export const SSE_TERMINAL_EVENTS = new Set([
    'evaluation_complete',
    'evaluation_error',
    'replay_complete',
]);

// ─── Webhook Event Options ───────────────────────────────────
export const WEBHOOK_EVENT_OPTIONS = [
    { value: 'evaluation_complete', label: 'Evaluation Complete' },
    { value: 'verdict_fail', label: 'Verdict Fail' },
    { value: 'score_below_threshold', label: 'Score Below Threshold' },
    { value: 'high_risk_fail', label: 'High Risk Fail' },
    { value: 'cost_spike', label: 'Cost Spike' },
];

// ─── Status Badge Styles ─────────────────────────────────────
export const STATUS_BADGE_STYLES = {
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Strategy Cost Bar Colors ────────────────────────────────
export const STRATEGY_COLORS = {
    council: 'bg-strategy-council',
    hybrid: 'bg-strategy-hybrid',
    single: 'bg-strategy-single',
};
