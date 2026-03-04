import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
    startEvaluation as apiStartEvaluation,
    getStreamUrl,
    getActiveEvaluation as apiGetActiveEvaluation,
} from '../lib/api';
import { ApiError } from '../lib/ApiError';
import { useSSE } from '../hooks/useSSE';

const ACTIVE_CONFLICT_CODE = 'EVALUATION_ALREADY_RUNNING';

// State shape
const initialState = {
    testCases: [],
    jobId: null,
    isLoading: false,
    isActiveSyncing: true,
    error: null,
    currentTestCase: 0,
    activeEvaluation: null,
};

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
                activeEvaluation: {
                    jobId: action.payload.jobId,
                    status: 'processing',
                    name: action.payload.name || '',
                    createdAt: action.payload.createdAt || new Date().toISOString(),
                },
            };
        case 'EVALUATION_ERROR':
            return { ...state, isLoading: false, error: action.payload };
        case 'SET_ACTIVE_SYNCING':
            return { ...state, isActiveSyncing: action.payload };
        case 'SET_ACTIVE_EVALUATION':
            return { ...state, activeEvaluation: action.payload };
        case 'SET_TEST_CASE':
            return { ...state, currentTestCase: action.payload };
        case 'RESET_LOCAL':
            return {
                ...state,
                testCases: [],
                jobId: null,
                isLoading: false,
                error: null,
                currentTestCase: 0,
            };
        default:
            return state;
    }
}

const EvaluationContext = createContext(null);

export function EvaluationProvider({ children }) {
    const [state, dispatch] = useReducer(evaluationReducer, initialState);

    // SSE subscription: only active when a local job context exists.
    const streamUrl = state.jobId ? getStreamUrl(state.jobId) : null;
    const { events, status: sseStatus, reset: resetSSE } = useSSE(streamUrl);

    const syncActiveEvaluation = useCallback(async (signal) => {
        dispatch({ type: 'SET_ACTIVE_SYNCING', payload: true });
        try {
            const activeEvaluation = await apiGetActiveEvaluation(signal);
            dispatch({
                type: 'SET_ACTIVE_EVALUATION',
                payload: activeEvaluation
                    ? {
                        jobId: activeEvaluation.jobId,
                        status: activeEvaluation.status,
                        name: activeEvaluation.name || '',
                        createdAt: activeEvaluation.createdAt || null,
                    }
                    : null,
            });
            return activeEvaluation;
        } catch (err) {
            if (!signal?.aborted) {
                dispatch({ type: 'EVALUATION_ERROR', payload: err.message });
            }
            throw err;
        } finally {
            if (!signal?.aborted) {
                dispatch({ type: 'SET_ACTIVE_SYNCING', payload: false });
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        syncActiveEvaluation(controller.signal).catch(() => { });
        return () => controller.abort();
    }, [syncActiveEvaluation]);

    useEffect(() => {
        const refresh = () => {
            syncActiveEvaluation().catch(() => { });
        };
        const interval = setInterval(refresh, 15000);
        window.addEventListener('focus', refresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', refresh);
        };
    }, [syncActiveEvaluation]);

    useEffect(() => {
        if (state.jobId && (sseStatus === 'complete' || sseStatus === 'error')) {
            syncActiveEvaluation().catch(() => { });
        }
    }, [state.jobId, sseStatus, syncActiveEvaluation]);

    const activeEvaluation = state.activeEvaluation;
    const activeJobId = activeEvaluation?.jobId || null;
    const isEvaluating = activeEvaluation?.status === 'processing';
    const canViewLiveActiveEvaluation = Boolean(
        isEvaluating &&
        state.jobId &&
        state.jobId === activeJobId &&
        state.testCases.length > 0
    );

    const submitEvaluation = useCallback(async (cases, options = {}) => {
        dispatch({ type: 'START_EVALUATION' });
        try {
            const response = await apiStartEvaluation(cases, options);
            dispatch({
                type: 'EVALUATION_SUCCESS',
                payload: {
                    jobId: response.jobId,
                    testCases: cases,
                    name: options?.name || '',
                    createdAt: new Date().toISOString(),
                },
            });
            return response.jobId;
        } catch (err) {
            if (err instanceof ApiError && err.status === 409 && err.data?.code === ACTIVE_CONFLICT_CODE) {
                dispatch({
                    type: 'SET_ACTIVE_EVALUATION',
                    payload: err.data?.activeJobId
                        ? {
                            jobId: err.data.activeJobId,
                            status: 'processing',
                            name: '',
                            createdAt: null,
                        }
                        : state.activeEvaluation,
                });
            }
            dispatch({ type: 'EVALUATION_ERROR', payload: err.message });
            throw err;
        }
    }, [state.activeEvaluation]);

    const resetEvaluation = useCallback(() => {
        resetSSE();
        dispatch({ type: 'RESET_LOCAL' });
        syncActiveEvaluation().catch(() => { });
    }, [resetSSE, syncActiveEvaluation]);

    const setCurrentTestCase = useCallback((index) => {
        dispatch({ type: 'SET_TEST_CASE', payload: index });
    }, []);

    const value = {
        ...state,
        events,
        sseStatus,
        activeEvaluation,
        activeJobId,
        isEvaluating,
        canViewLiveActiveEvaluation,
        submitEvaluation,
        resetEvaluation,
        setCurrentTestCase,
        syncActiveEvaluation,
    };

    return (
        <EvaluationContext.Provider value={value}>
            {children}
        </EvaluationContext.Provider>
    );
}

export function useEvaluation() {
    const ctx = useContext(EvaluationContext);
    if (!ctx) {
        throw new Error('useEvaluation must be used within an EvaluationProvider');
    }
    return ctx;
}
