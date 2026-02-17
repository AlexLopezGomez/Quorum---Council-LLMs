import { createContext, useContext, useReducer, useCallback } from 'react';
import { startEvaluation as apiStartEvaluation, getStreamUrl } from '../lib/api';
import { useSSE } from '../hooks/useSSE';

// ─── State shape ─────────────────────────────────────────────
const initialState = {
    view: 'upload',        // 'upload' | 'evaluating' | 'history' | 'webhooks'
    testCases: [],
    jobId: null,
    isLoading: false,
    error: null,
    currentTestCase: 0,
};

// ─── Reducer ─────────────────────────────────────────────────
function evaluationReducer(state, action) {
    switch (action.type) {
        case 'START_EVALUATION':
            return { ...state, isLoading: true, error: null };
        case 'EVALUATION_SUCCESS':
            return {
                ...state,
                isLoading: false,
                jobId: action.payload.jobId,
                testCases: action.payload.testCases,
                currentTestCase: 0,
                view: 'evaluating',
            };
        case 'EVALUATION_ERROR':
            return { ...state, isLoading: false, error: action.payload };
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'SET_TEST_CASE':
            return { ...state, currentTestCase: action.payload };
        case 'RESET':
            return { ...initialState };
        default:
            return state;
    }
}

// ─── Context ─────────────────────────────────────────────────
const EvaluationContext = createContext(null);

export function EvaluationProvider({ children }) {
    const [state, dispatch] = useReducer(evaluationReducer, initialState);

    // SSE subscription: only active when a jobId exists
    const streamUrl = state.jobId ? getStreamUrl(state.jobId) : null;
    const { events, status: sseStatus, reset: resetSSE } = useSSE(streamUrl);

    const isEvaluating =
        state.jobId && (sseStatus === 'connecting' || sseStatus === 'connected');

    // ── Actions ──────────────────────────────────────────────
    const submitEvaluation = useCallback(async (cases, options = {}) => {
        dispatch({ type: 'START_EVALUATION' });
        try {
            const response = await apiStartEvaluation(cases, options);
            dispatch({
                type: 'EVALUATION_SUCCESS',
                payload: { jobId: response.jobId, testCases: cases },
            });
        } catch (err) {
            dispatch({ type: 'EVALUATION_ERROR', payload: err.message });
        }
    }, []);

    const resetEvaluation = useCallback(() => {
        resetSSE();
        dispatch({ type: 'RESET' });
    }, [resetSSE]);

    const navigateTo = useCallback(
        (key) => {
            if (key === 'upload') {
                resetEvaluation();
            }
            dispatch({ type: 'SET_VIEW', payload: key });
        },
        [resetEvaluation],
    );

    const setCurrentTestCase = useCallback((index) => {
        dispatch({ type: 'SET_TEST_CASE', payload: index });
    }, []);

    const value = {
        // State
        ...state,
        events,
        sseStatus,
        isEvaluating,
        // Actions
        submitEvaluation,
        resetEvaluation,
        navigateTo,
        setCurrentTestCase,
    };

    return (
        <EvaluationContext.Provider value={value}>
            {children}
        </EvaluationContext.Provider>
    );
}

/**
 * Access the evaluation context.
 * Must be used inside an EvaluationProvider.
 */
export function useEvaluation() {
    const ctx = useContext(EvaluationContext);
    if (!ctx) {
        throw new Error('useEvaluation must be used within an EvaluationProvider');
    }
    return ctx;
}
