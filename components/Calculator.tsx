'use client';

import { useEffect, useReducer, useState } from 'react';

type Operator = '+' | '-' | '×' | '÷';

type HistoryItem = {
  id: string;
  expression: string;
  result: string;
  ts: number;
};

type State = {
  display: string;
  firstOperand: number | null;
  operator: Operator | null;
  waitingForSecond: boolean;
  memory: number | null;
  history: HistoryItem[];
};

type Action =
  | { type: 'digit'; payload: string }
  | { type: 'dot' }
  | { type: 'clear' }
  | { type: 'delete' }
  | { type: 'toggleSign' }
  | { type: 'percent' }
  | { type: 'operator'; payload: Operator }
  | { type: 'equals' }
  // Memory
  | { type: 'memoryClear' }
  | { type: 'memoryRecall' }
  | { type: 'memoryAdd' }
  | { type: 'memorySubtract' }
  // History
  | { type: 'historyClear' }
  | { type: 'setDisplay'; payload: string };

const initialState: State = {
  display: '0',
  firstOperand: null,
  operator: null,
  waitingForSecond: false,
  memory: null,
  history: [],
};

function calculate(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? Infinity : a / b;
  }
}

function formatResult(num: number): string {
  if (!Number.isFinite(num)) return 'Error';
  const trimmed = parseFloat(num.toFixed(12));
  if (Math.abs(trimmed) >= 1e12 || (Math.abs(trimmed) > 0 && Math.abs(trimmed) < 1e-6)) {
    return trimmed.toExponential(6);
  }
  // Strip trailing zeros after decimal
  const s = trimmed.toString();
  return s;
}

function parseDisplay(display: string): number {
  const n = parseFloat(display);
  return Number.isFinite(n) ? n : 0;
}

function pushHistory(history: HistoryItem[], expression: string, result: string, limit = 25): HistoryItem[] {
  const item: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    expression,
    result,
    ts: Date.now(),
  };
  const next = [item, ...history];
  return next.slice(0, limit);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'digit': {
      const d = action.payload;

      if (state.waitingForSecond) {
        return { ...state, display: d === '0' ? '0' : d, waitingForSecond: false };
      }

      if (state.display === '0') return { ...state, display: d };
      if (state.display === '-0') return { ...state, display: '-' + d };
      return { ...state, display: state.display + d };
    }

    case 'dot': {
      if (state.waitingForSecond) {
        return { ...state, display: '0.', waitingForSecond: false };
      }
      if (state.display.includes('.')) return state;
      return { ...state, display: state.display + '.' };
    }

    case 'clear':
      return { ...initialState, history: state.history, memory: state.memory };

    case 'delete': {
      if (state.waitingForSecond) return state;
      let next = state.display.slice(0, -1);
      if (next === '' || next === '-' || next === '-0') next = '0';
      return { ...state, display: next };
    }

    case 'toggleSign': {
      if (state.display === '0') return state;
      if (state.display.startsWith('-')) {
        return { ...state, display: state.display.slice(1) };
      }
      return { ...state, display: '-' + state.display };
    }

    case 'percent': {
      const current = parseFloat(state.display) || 0;
      if (state.firstOperand !== null && state.operator && !state.waitingForSecond) {
        const relative = (state.firstOperand * current) / 100;
        return { ...state, display: formatResult(relative) };
      }
      const result = current / 100;
      return { ...state, display: formatResult(result) };
    }

    case 'operator': {
      const nextOperator = action.payload;
      const inputValue = parseDisplay(state.display);

      // Change operator if second operand not started
      if (state.operator && state.waitingForSecond) {
        return { ...state, operator: nextOperator };
      }

      if (state.firstOperand === null) {
        return {
          ...state,
          firstOperand: inputValue,
          operator: nextOperator,
          waitingForSecond: true,
        };
      }

      if (state.operator) {
        const result = calculate(state.firstOperand, inputValue, state.operator);
        const formatted = formatResult(result);
        const expr = `${formatResult(state.firstOperand)} ${state.operator} ${formatResult(inputValue)} =`;
        return {
          display: formatted,
          firstOperand: result,
          operator: nextOperator,
          waitingForSecond: true,
          memory: state.memory,
          history: pushHistory(state.history, expr, formatted),
        };
      }

      return state;
    }

    case 'equals': {
      if (!state.operator || state.waitingForSecond || state.firstOperand === null) return state;
      const inputValue = parseDisplay(state.display);
      const result = calculate(state.firstOperand, inputValue, state.operator);
      const formatted = formatResult(result);
      const expr = `${formatResult(state.firstOperand)} ${state.operator} ${formatResult(inputValue)} =`;
      return {
        display: formatted,
        firstOperand: null,
        operator: null,
        waitingForSecond: false,
        memory: state.memory,
        history: pushHistory(state.history, expr, formatted),
      };
    }

    // Memory actions
    case 'memoryClear':
      return { ...state, memory: null };

    case 'memoryRecall': {
      if (state.memory === null) return state;
      return { ...state, display: formatResult(state.memory), waitingForSecond: false };
    }

    case 'memoryAdd': {
      const current = parseDisplay(state.display);
      const next = (state.memory ?? 0) + current;
      return { ...state, memory: next };
    }

    case 'memorySubtract': {
      const current = parseDisplay(state.display);
      const next = (state.memory ?? 0) - current;
      return { ...state, memory: next };
    }

    // History UI helpers
    case 'historyClear':
      return { ...state, history: [] };

    case 'setDisplay':
      return {
        ...state,
        display: action.payload,
        firstOperand: null,
        operator: null,
        waitingForSecond: false,
      };

    default:
      return state;
  }
}

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showHistory, setShowHistory] = useState(false);

  // Keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key;
      if (/\d/.test(k)) {
        dispatch({ type: 'digit', payload: k });
      } else if (k === '.') {
        dispatch({ type: 'dot' });
      } else if (k === '+' || k === '-') {
        dispatch({ type: 'operator', payload: k as Operator });
      } else if (k === '*') {
        dispatch({ type: 'operator', payload: '×' });
      } else if (k === '/') {
        dispatch({ type: 'operator', payload: '÷' });
      } else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        dispatch({ type: 'equals' });
      } else if (k === 'Backspace') {
        dispatch({ type: 'delete' });
      } else if (k === 'Escape') {
        dispatch({ type: 'clear' });
      } else if (k === '%') {
        dispatch({ type: 'percent' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const baseBtn =
    'rounded-xl py-3 sm:py-4 text-lg font-semibold transition active:scale-95 select-none ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';
  const digitBtn = `${baseBtn} bg-slate-700 hover:bg-slate-600 text-slate-50 focus:ring-slate-400`;
  const utilBtn = `${baseBtn} bg-slate-600 hover:bg-slate-500 text-white focus:ring-slate-300`;
  const opBtn = `${baseBtn} bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-300`;
  const eqBtn = `${baseBtn} bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-300`;

  const hasMemory = state.memory !== null;

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-slate-800/70 backdrop-blur rounded-3xl shadow-2xl ring-1 ring-white/10 p-4 sm:p-6">
      {/* Display */}
      <div
        aria-label="Calculator display"
        role="textbox"
        className="h-24 sm:h-28 px-3 mb-3 sm:mb-4 rounded-2xl bg-slate-900/60 flex items-end justify-end"
      >
        <div className="text-4xl sm:text-5xl font-medium tabular-nums tracking-tight break-all">
          {state.display}
        </div>
      </div>

      {/* History toolbar */}
      <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
        <button
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-700/60"
          onClick={() => setShowHistory((s) => !s)}
          aria-expanded={showHistory}
        >
          <span>🕘 History</span>
          <span className="rounded bg-slate-700/70 px-1.5 py-0.5 text-xs text-slate-200">
            {state.history.length}
          </span>
        </button>
        {showHistory && state.history.length > 0 && (
          <button
            className="rounded-lg px-2 py-1 hover:bg-slate-700/60"
            onClick={() => dispatch({ type: 'historyClear' })}
          >
            Clear
          </button>
        )}
      </div>

      {showHistory && (
        <div className="mb-4 max-h-40 overflow-y-auto rounded-xl bg-slate-900/40 p-2 ring-1 ring-white/5">
          {state.history.length === 0 ? (
            <div className="text-sm text-slate-400 px-1 py-2">No history yet</div>
          ) : (
            <ul className="space-y-1">
              {state.history.map((h) => (
                <li key={h.id}>
                  <button
                    className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-700/50"
                    onClick={() => dispatch({ type: 'setDisplay', payload: h.result })}
                    title="Click to load result"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-xs sm:text-sm text-slate-300">{h.expression}</span>
                      <span className="font-mono text-sm sm:text-base text-slate-100">{h.result}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Memory row */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-3">
        <button className={utilBtn} onClick={() => dispatch({ type: 'memoryClear' })} disabled={!hasMemory}>
          MC
        </button>
        <button className={utilBtn} onClick={() => dispatch({ type: 'memoryRecall' })} disabled={!hasMemory}>
          MR
        </button>
        <button className={utilBtn} onClick={() => dispatch({ type: 'memoryAdd' })}>M+</button>
        <button className={utilBtn} onClick={() => dispatch({ type: 'memorySubtract' })}>M−</button>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        <button className={utilBtn} onClick={() => dispatch({ type: 'clear' })}>C</button>
        <button className={utilBtn} onClick={() => dispatch({ type: 'delete' })}>DEL</button>
        <button className={utilBtn} onClick={() => dispatch({ type: 'percent' })}>%</button>
        <button className={opBtn} onClick={() => dispatch({ type: 'operator', payload: '÷' })}>÷</button>

        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '7' })}>7</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '8' })}>8</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '9' })}>9</button>
        <button className={opBtn} onClick={() => dispatch({ type: 'operator', payload: '×' })}>×</button>

        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '4' })}>4</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '5' })}>5</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '6' })}>6</button>
        <button className={opBtn} onClick={() => dispatch({ type: 'operator', payload: '-' })}>−</button>

        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '1' })}>1</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '2' })}>2</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '3' })}>3</button>
        <button className={opBtn} onClick={() => dispatch({ type: 'operator', payload: '+' })}>+</button>

        <button className={utilBtn} onClick={() => dispatch({ type: 'toggleSign' })}>+/−</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'digit', payload: '0' })}>0</button>
        <button className={digitBtn} onClick={() => dispatch({ type: 'dot' })}>.</button>
        <button className={eqBtn} onClick={() => dispatch({ type: 'equals' })}>=</button>
      </div>
    </div>
  );
}