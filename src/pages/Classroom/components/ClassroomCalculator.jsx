import { useState } from 'react';

const BUTTONS = [
    '7', '8', '9', '÷',
    '4', '5', '6', '×',
    '1', '2', '3', '−',
    '0', ',', '=', '+',
];

function calculate(first, second, operation) {
    if (operation === '+') {
        return first + second;
    }

    if (operation === '−') {
        return first - second;
    }

    if (operation === '×') {
        return first * second;
    }

    if (operation === '÷') {
        return second === 0 ? null : first / second;
    }

    return second;
}

export function ClassroomCalculator() {
    const [display, setDisplay] = useState('0');
    const [storedValue, setStoredValue] = useState(null);
    const [operation, setOperation] = useState(null);
    const [replaceDisplay, setReplaceDisplay] = useState(false);

    const inputDigit = (value) => {
        const digit = value === ',' ? '.' : value;

        if (digit === '.' && display.includes('.') && !replaceDisplay) {
            return;
        }

        setDisplay((current) => {
            if (replaceDisplay) {
                return digit === '.' ? '0.' : digit;
            }

            if (current === '0' && digit !== '.') {
                return digit;
            }

            return `${current}${digit}`.slice(0, 16);
        });
        setReplaceDisplay(false);
    };

    const chooseOperation = (nextOperation) => {
        const currentValue = Number(display);

        if (storedValue !== null && operation && !replaceDisplay) {
            const result = calculate(storedValue, currentValue, operation);

            if (result === null) {
                setDisplay('Ошибка');
                setStoredValue(null);
                setOperation(null);
                setReplaceDisplay(true);
                return;
            }

            setStoredValue(result);
            setDisplay(String(Number(result.toFixed(10))));
        } else {
            setStoredValue(currentValue);
        }

        setOperation(nextOperation);
        setReplaceDisplay(true);
    };

    const showResult = () => {
        if (storedValue === null || !operation) {
            return;
        }

        const result = calculate(storedValue, Number(display), operation);

        setDisplay(
            result === null
                ? 'Ошибка'
                : String(Number(result.toFixed(10))),
        );
        setStoredValue(null);
        setOperation(null);
        setReplaceDisplay(true);
    };

    const clear = () => {
        setDisplay('0');
        setStoredValue(null);
        setOperation(null);
        setReplaceDisplay(false);
    };

    return (
        <div className="classroom-calculator">
            <div className="classroom-calculator__display">
                <small>{operation || 'Калькулятор'}</small>
                <strong>{display.replace('.', ',')}</strong>
            </div>

            <div className="classroom-calculator__buttons">
                <button type="button" className="is-clear" onClick={clear}>
                    Очистить
                </button>

                {BUTTONS.map((button) => (
                    <button
                        type="button"
                        className={['÷', '×', '−', '+', '='].includes(button)
                            ? 'is-operation'
                            : ''}
                        key={button}
                        onClick={() => {
                            if (button === '=') {
                                showResult();
                            } else if (['÷', '×', '−', '+'].includes(button)) {
                                chooseOperation(button);
                            } else {
                                inputDigit(button);
                            }
                        }}
                    >
                        {button}
                    </button>
                ))}
            </div>
        </div>
    );
}
