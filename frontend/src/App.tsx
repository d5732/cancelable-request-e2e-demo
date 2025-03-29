import {
  Autocomplete,
  AutocompleteRenderInputParams,
  Box,
  CircularProgress,
  createTheme,
  CssBaseline,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:3000";

const COLORS = {
  success: "#4caf50", // Green for positive aspects
  error: "#f44336", // Red for negative aspects
} as const;

interface LiProps {
  children: React.ReactNode;
  color: keyof typeof COLORS;
  isLast?: boolean;
}

function Li({ children, color, isLast = false }: LiProps) {
  return (
    <li
      style={{
        color: COLORS[color],
        backgroundColor: `${COLORS[color]}15`,
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        marginBottom: isLast ? 0 : "0.5rem",
      }}
    >
      {children}
    </li>
  );
}

const darkTheme = createTheme({ palette: { mode: "dark" } });

interface Dog {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

function App() {
  const [abortControllers, setAbortControllers] = useState<
    Map<string, AbortController>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Dog[]>([]);

  async function fetchWithSignal(url: RequestInfo | URL, inputId: string) {
    const ac = new AbortController();
    setAbortControllers((prev) => new Map(prev).set(inputId, ac));

    try {
      setLoading(true);
      const response = await fetch(url, {
        signal: ac.signal,
      });
      const data = await response.json();
      setOptions(data);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Error fetching dogs:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  function abortPreviousFetch(inputId: string) {
    const controller = abortControllers.get(inputId);
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="container">
        <Typography variant="h4" component="h1" gutterBottom>
          Cancelable Requests
        </Typography>
        <div className="card">
          <Typography variant="h6" gutterBottom>
            With abort and cancelable query
          </Typography>
          <Autocomplete<Dog>
            options={options}
            loading={loading}
            getOptionLabel={(option: Dog) => option.name}
            onChange={(_: unknown, newValue: Dog | null) => {
              console.log("Selected:", newValue);
            }}
            onInputChange={(_: unknown, newInputValue: string) => {
              abortPreviousFetch("with-abort-cancelable");
              fetchWithSignal(
                `${BACKEND_URL}/v1/dogs/cancelable/search?name=${encodeURIComponent(
                  newInputValue
                )}`,
                "with-abort-cancelable"
              );
            }}
            renderInput={(params: AutocompleteRenderInputParams) => (
              <TextField
                {...params}
                label="Search dogs (cancelable database query)"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" component="p">
              This fetch uses an abort controller and hits a customized endpoint
              that cancels the original database query if the http connection
              closes before the request completes.
            </Typography>
            <Typography variant="body1" component="p">
              Resources will be freed by the backend and database after the
              frontend has aborted the request.
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Tradeoffs
            </Typography>
            <Typography variant="body1" component="ul" sx={{ mt: 0, pl: 2 }}>
              <Li color="success">
                Frees up resources faster for backend and database
              </Li>
              <Li color="error" isLast>
                More complex to implement
              </Li>
            </Typography>
          </Box>
        </div>

        <div className="card">
          <Typography variant="h6" gutterBottom>
            With abort
          </Typography>
          <Autocomplete<Dog>
            options={options}
            loading={loading}
            getOptionLabel={(option: Dog) => option.name}
            onChange={(_: unknown, newValue: Dog | null) => {
              console.log("Selected:", newValue);
            }}
            onInputChange={(_: unknown, newInputValue: string) => {
              abortPreviousFetch("with-abort");
              fetchWithSignal(
                `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                  newInputValue
                )}`,
                "with-abort"
              );
            }}
            renderInput={(params: AutocompleteRenderInputParams) => (
              <TextField
                {...params}
                label="Search dogs"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" component="p">
              This fetch uses an abort controller. When the input changes, the
              previous fetch will be aborted.
            </Typography>
            <Typography variant="body1" component="p">
              Resources will remain allocated by the backend and database even
              after the frontend has aborted the request.
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Tradeoffs
            </Typography>
            <Typography variant="body1" component="p">
              <Li color="success">Avoids race conditions</Li>
              <Li color="error" isLast>
                But increases resource demands on backend and database
              </Li>
            </Typography>
          </Box>
        </div>

        <div className="card">
          <Typography variant="h6" gutterBottom>
            Without abort
          </Typography>
          <Autocomplete<Dog>
            options={options}
            loading={loading}
            getOptionLabel={(option: Dog) => option.name}
            onChange={(_: unknown, newValue: Dog | null) => {
              console.log("Selected:", newValue);
            }}
            onInputChange={(_: unknown, newInputValue: string) => {
              abortPreviousFetch("without-abort");
              fetchWithSignal(
                `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                  newInputValue
                )}`,
                "without-abort"
              );
            }}
            renderInput={(params: AutocompleteRenderInputParams) => (
              <TextField
                {...params}
                label="Search dogs"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" component="p">
              This fetch does not use an abort controller at all. When the input
              changes, the previous fetch will continue to run until it
              completes.
            </Typography>
            <Typography variant="body1" component="p">
              Well-behaved browsers will limit the number of requests per same
              origin, which we should consider when understanding the overall
              impact of the no-abort approach.
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Tradeoffs
            </Typography>
            <Typography variant="body1" component="ul" sx={{ mt: 0, pl: 2 }}>
              <Li color="success">Easy to implement</Li>
              <Li color="error" isLast>
                Only suitable for simple frontend apps
              </Li>
            </Typography>
          </Box>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
