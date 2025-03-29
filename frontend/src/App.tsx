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
  TypographyProps,
} from "@mui/material";
import { useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:3000";

function App() {
  const [abortControllers, setAbortControllers] = useState<
    Map<string, AbortController>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Dog[]>([]);

  async function fetchWithAbortController(
    url: RequestInfo | URL,
    inputId: string
  ) {
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

  async function fetchWithoutAbortController(url: RequestInfo | URL) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      setOptions(data);
    } catch (error) {
      console.error("Error fetching dogs:", error);
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
        <H1>Cancelable Requests</H1>

        <div className="card">
          <H2>Background</H2>
          <P sx={{ mb: 2 }}>
            HTTP/1.1 specifications (
            <a href="https://datatracker.ietf.org/doc/html/rfc7230#section-6.4">
              RFC 7230
            </a>
            ) state that "A client ought to limit the number of simultaneous
            open connections that it maintains to a given server." Modern
            browsers typically limit concurrent connections to 6 per server, as
            a built-in throttling mechanism.
          </P>
          <P sx={{ mb: 2 }}>
            The AbortController API provides a mechanism to terminate ongoing
            HTTP requests by closing the underlying connection. This is
            effectively equivalent to closing a browser tab while a request is
            in progress.
          </P>
          <P sx={{ mb: 2 }}>
            When the connection is terminated, any server-side processing that
            has already begun may continue until completion unless explicitly
            handled by the server.
          </P>
          <P sx={{ mb: 2 }}>
            To demonstrate different tradeoffs, this demo app shows what happens
            when searching for dogs by name in a backend API which relies on a
            database, using 3 different approaches.
          </P>
        </div>

        <div className="card">
          <H2>Testing Setup</H2>
          <P sx={{ mb: 2 }}>
            Navigate to the backend's{" "}
            <a href="http://localhost:3000/swagger#/dogs/AppController_seedDogs">
              Swagger UI
            </a>{" "}
            and seed the database with dog records. On my machine, I had to seed
            at least 1 million dog records to get most queries to take longer
            than 1 second, which is a good threshold for observation.
          </P>
          <P sx={{ mb: 2 }}>
            The dog table's <code>name</code> column is deliberately not
            indexed, to make the query slow.
          </P>
          <P sx={{ mb: 2 }}>Open a terminal and run:</P>
          <Typography
            variant="body1"
            component="pre"
            sx={{
              mb: 2,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              padding: "1rem",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            $ docker stats
          </Typography>
          <P sx={{ mb: 2 }}>
            This will display CPU consumption, etc., of the database container,
            allowing you to observe the resource impact of each different
            approach.
          </P>
        </div>

        <div className="card">
          <H2>With Abort and Cancelable Query 🤓</H2>
          <Autocomplete<Dog>
            options={options}
            loading={loading}
            getOptionLabel={(option: Dog) => option.name}
            onChange={(_: unknown, newValue: Dog | null) => {
              console.log("Selected:", newValue);
            }}
            onInputChange={(_: unknown, newInputValue: string) => {
              const queryKey = "with-abort-cancelable";
              abortPreviousFetch(queryKey);
              fetchWithAbortController(
                `${BACKEND_URL}/v1/dogs/cancelable/search?name=${encodeURIComponent(
                  newInputValue
                )}`,
                queryKey
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
            <P sx={{ mb: 2 }}>
              The frontend uses an AbortController to abort HTTP requests when
              the search term changes.
            </P>
            <P sx={{ mb: 2 }}>
              The backend handles closed HTTP connections by terminating the
              database query.
            </P>
            <P sx={{ mb: 2 }}>
              This frees database resources faster, if the frontend aborts the
              aborts the fetch.
            </P>
            <H2>Tradeoffs</H2>
            <Ul>
              <Li color="success">
                Optimizes resource utilization through immediate deallocation
              </Li>
              <Li color="error" isLast>
                Requires complex implementation across multiple system layers
              </Li>
            </Ul>
            <H2>Expected Behavior</H2>
            <P sx={{ mb: 2 }}>
              The frontend should abort the fetch if the user keeps typing.
              However, because the backend implementation terminates the backend
              query when the connection is closed, database resources should be
              freed much faster, even when the user types quickly, emitting
              numerous requests.
            </P>
            <P sx={{ mb: 2 }}>
              On my machine, I was able to trigger ~400 HTTP requets in 10
              seconds by typing random characters. I saw the database CPU %
              spike to about 1200% while typing.
            </P>
            <P sx={{ mb: 2 }}>
              After stopping typing, database CPU % returned to ~0% in just a
              few seconds.
            </P>
          </Box>
        </div>

        <div className="card">
          <H2>With Abort 🤔</H2>
          <Autocomplete<Dog>
            options={options}
            loading={loading}
            getOptionLabel={(option: Dog) => option.name}
            onChange={(_: unknown, newValue: Dog | null) => {
              console.log("Selected:", newValue);
            }}
            onInputChange={(_: unknown, newInputValue: string) => {
              const queryKey = "with-abort";
              abortPreviousFetch(queryKey);
              fetchWithAbortController(
                `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                  newInputValue
                )}`,
                queryKey
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
            <P sx={{ mb: 2 }}>
              The frontend uses an AbortController to abort HTTP requests when
              the search term changes.
            </P>
            <P sx={{ mb: 2 }}>
              However, the backend doesn't do anything special when the client
              closes a request early, so the database query is not terminated
              early.
            </P>
            <P sx={{ mb: 2 }}>
              By aborting early and creating new requests rapidly, we
              effectively bypass the browser's native limit of concurrent
              same-origin connections, increasing the load on the backend.
            </P>
            <H2>Tradeoffs</H2>
            <Ul>
              <Li color="success">Prevents request race conditions</Li>
              <Li color="error" isLast>
                Increases concurrent load on the backend and database
              </Li>
            </Ul>
            <H2>Expected Behavior</H2>
            <P sx={{ mb: 2 }}>
              The frontend should abort the fetch if the user keeps typing. The
              backend will complete the request cycle though, because no special
              logic exists on this endpoint to terminate the database query
              early.
            </P>
            <P sx={{ mb: 2 }}>
              On my machine, I was able to trigger ~400 HTTP requets in 10
              seconds by typing random characters. I saw the database CPU %
              spike to about 1200% while typing.
            </P>
            <P sx={{ mb: 2 }}>
              After stopping typing, database CPU % returned to ~0% in around 20
              seconds. This is because TypeOrm's limit of concurrent database
              connections causes requests to pile up, placing high demand on
              database CPU % for a long time.
            </P>
          </Box>
        </div>

        <div className="card">
          <H2>Without Abort 😅</H2>
          <Autocomplete<Dog>
            options={options}
            loading={loading}
            getOptionLabel={(option: Dog) => option.name}
            onChange={(_: unknown, newValue: Dog | null) => {
              console.log("Selected:", newValue);
            }}
            onInputChange={(_: unknown, newInputValue: string) => {
              // Fetch without abort controller
              fetchWithoutAbortController(
                `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                  newInputValue
                )}`
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
            <P sx={{ mb: 2 }}>
              In this example, the frontend foregoes request termination
              entirely, allowing concurrent requests to complete regardless of
              input state changes.
            </P>
            <P sx={{ mb: 2 }}>
              Browser-level request throttling mechanisms provide inherent rate
              limiting for same-origin requests, mitigating potential system
              overload.
            </P>
            <H2>Tradeoffs</H2>
            <Ul>
              <Li color="success">Minimal implementation complexity</Li>
              <Li color="error" isLast>
                Only suitable for simple applications
              </Li>
            </Ul>
            <H2>Expected Behavior</H2>
            <P sx={{ mb: 2 }}>
              The frontend will not abort the fetch if the user keeps typing.
            </P>
            <P sx={{ mb: 2 }}>
              You will likely notice the native browser throttling mechanism is
              effective, as the database CPU % should remain lower.
            </P>
            <P sx={{ mb: 2 }}>
              Because no requests are canceled, pending requests pile up on the
              frontend, and take longer to cycle through. However, the backend
              and database saturation should be smoother instead of spiking, as
              we saw in the other examples.
            </P>
          </Box>
        </div>
      </div>
    </ThemeProvider>
  );
}

const P = ({ children, ...props }: TypographyProps) => (
  <Typography variant="body1" component="p" {...props}>
    {children}
  </Typography>
);

const Ul = ({ children, ...props }: TypographyProps) => (
  <Typography variant="body1" component="ul" sx={{ mt: 0, pl: 2 }} {...props}>
    {children}
  </Typography>
);

const H1 = ({ children, ...props }: TypographyProps) => (
  <Typography variant="h4" component="h1" gutterBottom {...props}>
    {children}
  </Typography>
);

const H2 = ({ children, ...props }: TypographyProps) => (
  <Typography
    variant="h6"
    component="h2"
    gutterBottom
    sx={{ mt: 3 }}
    {...props}
  >
    {children}
  </Typography>
);

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

interface Dog {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface LiProps {
  children: React.ReactNode;
  color: keyof typeof COLORS;
  isLast?: boolean;
}

const COLORS = {
  success: "#4caf50",
  error: "#f44336",
} as const;

const darkTheme = createTheme({ palette: { mode: "dark" } });

export default App;
