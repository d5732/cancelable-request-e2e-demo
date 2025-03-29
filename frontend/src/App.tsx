import { useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:3000";

function App() {
  const [ac, setAc] = useState<AbortController | null>(null);
  async function fetchWithSignal(url: RequestInfo | URL) {
    const ac = new AbortController();
    setAc(ac);
    await fetch(url, {
      signal: ac.signal,
    });
  }

  function abortPreviousFetch() {
    if (ac && !ac?.signal.aborted) ac.abort();
  }
  return (
    <>
      <h1>E2E Cancelable Requests</h1>
      <div className="card">
        <label>test without abort</label>
        <input onChange={async () => await fetch(BACKEND_URL)} />
      </div>

      <div className="card">
        <label>test with abort</label>
        <input
          onChange={async () => {
            abortPreviousFetch();
            await fetchWithSignal(BACKEND_URL);
          }}
        />
      </div>
    </>
  );
}

export default App;
