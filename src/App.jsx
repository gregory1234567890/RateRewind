import { useState, useEffect, useReducer, useRef } from 'react';
import './App.css';

const currencies = ['usd', 'eur', 'gbp', 'chf'];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function entriesReducer(state, action) {
  if (action.type === 'ADD_ENTRY') {
    return [...state, action.payload];
  }
  if (action.type === 'REMOVE_ENTRY') {
    return state.filter((entry) => entry.id !== action.payload);
  }
  return state;
}

function loadEntries() {
  const saved = localStorage.getItem('entries');
  if (saved == null) return [];
  return JSON.parse(saved);
}

function App() {
  const [historicalRate, setHistoricalRate] = useState(null);
  const [currentRate, setCurrentRate] = useState(null);
  const [date, setDate] = useState(getTodayDate());
  const [cash, setCash] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [entries, dispatch] = useReducer(entriesReducer, loadEntries());
  const [error, setError] = useState(null);
  const cashInputRef = useRef(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    localStorage.setItem('entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json')
      .then((res) => res.json())
      .then((data) => {
        setDate(data.rates[0].effectiveDate);
      });
  }, []);

  useEffect(() => {
    fetch(
      `https://api.nbp.pl/api/exchangerates/rates/a/${currency}/${date}/?format=json`,
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error('No data for this date');
        }
        return res.json();
      })
      .then((data) => {
        setHistoricalRate(data.rates[0].mid);
        setError(null);
      })
      .catch((err) => {
        console.log('Błąd: ' + err.message);
        setHistoricalRate(null);
        setError(err.message);
      });

    fetch(
      `https://api.nbp.pl/api/exchangerates/rates/a/${currency}/?format=json`,
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error('No data for this date');
        }
        return res.json();
      })
      .then((data) => {
        setCurrentRate(data.rates[0].mid);
      })
      .catch((err) => {
        console.log('Błąd: ' + err.message);
        setCurrentRate(null);
      });
  }, [date, currency]);

  const result =
    historicalRate && currentRate
      ? (Number(cash) / historicalRate) * currentRate
      : null;

  let message;
  if (result) {
    message = result.toFixed(2);
  } else if (error) {
    message = error;
  } else {
    message = 'calculating...';
  }

  let totalResult = entries.reduce((total, entry) => total + entry.result, 0);
  let totalCash = entries.reduce((total, entry) => total + entry.cash, 0);

  function addEntry() {
    if (!result) return;
    const newEntry = {
      id: Date.now(),
      cash: Number(cash),
      currency,
      date,
      result: Number(result.toFixed(2)),
    };
    dispatch({ type: 'ADD_ENTRY', payload: newEntry });
    setCash('');
    cashInputRef.current.focus();
  }

  return (
    <div className={`page ${theme}`}>
      <h1>RateRewind</h1>
      <h2>
        Find out how much money converted into a foreign currency on a specific
        date in the past would be worth today.
      </h2>
      <div className="app">
        <h3>
          {currency.toUpperCase()} exchange rate from {date}:
        </h3>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Theme: {theme}
        </button>
        <input
          type="date"
          value={date}
          max={getTodayDate()}
          onChange={(e) => setDate(e.target.value)}
        />
        <p>Historical rate: {historicalRate}</p>
        <p>Today's rate: {currentRate}</p>

        <input
          type="number"
          onChange={(e) => setCash(e.target.value)}
          placeholder="Amount in PLN?"
          ref={cashInputRef}
          value={cash}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>

        <p>
          {cash} {currency.toUpperCase()} today: {message}
        </p>

        <button onClick={addEntry}>Add entry</button>
        <ul>
          {entries.map((e) => (
            <li key={e.id}>
              {e.cash} PLN → {e.currency.toUpperCase()} {e.date}:
              {' worth today '}
              {e.result.toFixed(2)} zł
              <button
                onClick={() =>
                  dispatch({
                    type: 'REMOVE_ENTRY',
                    payload: e.id,
                  })
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <p>Total deposited: {totalCash} zł</p>
        <p>Total today: {totalResult.toFixed(2)} zł</p>
        <p
          className={
            (totalResult.toFixed(2) - totalCash).toFixed(2) > 0
              ? 'finalResult gain'
              : 'finalResult loss'
          }
        >
          Profit/loss: {(totalResult.toFixed(2) - totalCash).toFixed(2)} PLN
        </p>
      </div>
    </div>
  );
}

export default App;
