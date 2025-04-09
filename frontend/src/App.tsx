import {
  Autocomplete,
  AutocompleteRenderInputParams,
  Box,
  CircularProgress,
  createTheme,
  CssBaseline,
  Divider,
  TextField,
  ThemeProvider,
  Typography,
  TypographyProps,
} from "@mui/material";
import { useState } from "react";
import "./App.css";
import {
  CpuConsumptionChart,
  SpikeDurationChart,
  WaitTimeChart,
} from "./PerformanceComparisonChart";

const BACKEND_URL = "http://localhost:3000";

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="container">
        <div className="card">
          <H1>End-to-end Request Cancellation</H1>

          <H2>Why Would You Want to Cancel a Request?</H2>
          <P sx={{ mb: 2 }}>
            Imagine an e-commerce website like Amazon with a dynamic product
            search bar. When a customer begins typing into the search bar, the
            frontend immediately sends out HTTP requests for autocomplete
            suggestions and potential product matches. Each keystroke
            potentially triggers another request—even before the previous ones
            have finished processing.
          </P>

          <P sx={{ mb: 2 }}>
            Most modern browsers limit concurrent connections to{" "}
            <b>6 per server</b>. This is in compliance with HTTP/1.1
            specifications (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://datatracker.ietf.org/doc/html/rfc7230#section-6.4"
            >
              RFC 7230
            </a>
            ) which state that "a client ought to limit the number of
            simultaneous open connections that it maintains to a given server."
            This limitation presents challenges for these dynamic UIs. The
            browser's connection limit can cause requests to pile up in a queue,
            increasing wait times.
          </P>
          <P sx={{ mb: 2 }}>
            Even within the connection limit, multiple requests can produce race
            conditions on the frontend, because responses may be returned out of
            order. This can lead to unexpected behavior.
          </P>
          <P sx={{ mb: 2 }}>
            To avoid these issues, we can cancel requests which are no longer
            relevant. The{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://developer.mozilla.org/en-US/docs/Web/API/AbortController"
            >
              AbortController API
            </a>{" "}
            offers a solution, by enabling frontend applications to terminate
            pending HTTP requests.
          </P>

          <H2>The AbortController Problem</H2>

          <P sx={{ mb: 2 }}>
            AbortController is a double-edged sword. While it allows the
            frontend to cancel requests, it doesn't automatically cancel the
            corresponding backend operations. This can create dramatic spikes in
            the number of concurrent requests your backend is handling, because{" "}
            <b>
              canceling requests effectively bypasses the browser's native
              throttling of concurrent same-origin connections.
            </b>
          </P>
          <P sx={{ mb: 2 }}>
            A common mitigation strategy is to make backend operations as
            efficient as possible, and simply allow the backend to complete
            unnecessary operations for each canceled HTTP request. However, this
            may not always be sufficient. At a certain scale, regardless of
            optimization efforts, unnecessary operations would still be costly.
          </P>
          <P sx={{ mb: 2 }}>
            Additionally, especially in distributed systems, there are often
            organizational and technical roadblocks, where more conventional
            solutions could be outright prohibited, e.g., changes to the schema,
            architecture, etc.
          </P>
          <P>
            In these extreme scenarios, we can consider another strategy:{" "}
            <b>propagate cancellation end-to-end.</b>
          </P>

          <H2>Demo Time 🤓</H2>

          <P sx={{ mb: 2 }}>
            This demo app explores the problem case of a dynamic UI with
            degraded performance caused by slow database queries.
          </P>
          <P sx={{ mb: 2 }}>
            Below, you will find 3 different typeahead components. As you type,
            each will fetch a list of dogs 🐶 from a backend webserver over
            HTTP, to populate the list of dropdown options. A new request is
            triggered every time the user types a character.
          </P>

          <P sx={{ mb: 2 }}>
            The query executed by the webserver to fetch dogs is:{" "}
          </P>
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
            SELECT * FROM dogs WHERE name ILIKE $1 LIMIT 500;
          </Typography>
          <P sx={{ mb: 2 }}>
            The backend adds <code>%</code> wildcards the search term provided
            by the UI, such that the
            <code>name</code> is transformed to <code>`%name%`</code> when
            passed as a parameter to the SQL statement.
          </P>
          <P sx={{ mb: 2 }}>
            The{" "}
            <b>
              <code>dogs.name</code>
            </b>{" "}
            column is deliberately <b>not indexed</b>. Thus, each database query
            will perform a full table scan.
          </P>
          <P sx={{ mb: 2 }}>
            These constraints are contrived to make the database query slow.
            This will help us observe the impact of end-to-end request
            cancellation.
          </P>
        </div>

        <div className="card">
          <H1>Setup Instructions</H1>

          <H2>Seed the Database</H2>

          <P sx={{ mb: 2 }}>
            On my machine, I had to seed at least <b>1 million records</b> to
            make the "search dogs by name" query take longer than 1 second,
            which is the suggested threshold for meaningful observation.
          </P>
          <P>
            To seed dogs, navigate to{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="http://localhost:3000/swagger#/dogs/AppController_seedDogs"
            >
              Swagger UI
            </a>{" "}
            and enter the desired number of records to seed. Note that it took
            ~1 minute to seed 1 million records on my machine.
          </P>

          <H2>Observe Resource Impact</H2>

          <P sx={{ mb: 2 }}>
            To observe the resource impact of each different implementation, you
            will want to monitor the database container's resource usage.
          </P>
          <P sx={{ mb: 2 }}>
            To display <code>CPU %</code> usage of the database container, open
            a terminal and run:
          </P>
          <Typography
            variant="body1"
            component="pre"
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              padding: "1rem",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            $ docker stats
          </Typography>
        </div>

        <div className="card">
          <H1>Implementation Examples</H1>

          <H2>1. No Abort 😅</H2>

          <Box sx={{ mb: 2 }}>
            <AutocompleteWrapper
              useAbortController={false}
              label="Search dogs by name"
              getSearchUrl={(inputValue) =>
                `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                  inputValue
                )}`
              }
            />
          </Box>
          <P>
            In this example, the frontend foregoes request termination entirely,
            allowing concurrent requests to complete regardless of UI state
            changes.
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
            Because no requests are canceled, a queue of requests may pile up on
            the frontend, taking a long time to cycle through. This puts
            consistent pressure on the database, and delays the return of the
            only significant result (the last request), resulting in a poor user
            experience.
          </P>
          <P sx={{ mb: 2 }}>
            On my machine, I was able to queue ~400 HTTP requests in 10 seconds
            by typing random characters.
          </P>
          <P sx={{ mb: 2 }}>
            It took <b>~1 minute</b> to cycle through the queue of requests on
            the frontend.
          </P>
          <P>
            I saw the database <code>CPU %</code> spike to <b>~1200%</b> while
            the frontend cycled through the queue of requests.
          </P>

          <Divider sx={{ mt: 4, mb: 4 }} />

          <H2>2. Simple Abort 🤔</H2>

          <Box sx={{ mb: 2 }}>
            <AutocompleteWrapper
              label="Search dogs by name"
              getSearchUrl={(inputValue) =>
                `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                  inputValue
                )}`
              }
            />
          </Box>
          <P sx={{ mb: 2 }}>
            The frontend uses an AbortController to abort HTTP requests when the
            search term changes.
          </P>
          <P sx={{ mb: 2 }}>
            However, the backend doesn't do anything special when the client
            closes a request early, so the database query is not terminated
            early.
          </P>
          <P>
            By aborting early and creating new requests rapidly, we effectively
            bypass the browser's native limit of concurrent same-origin
            connections, potentially increasing the load on the backend.
          </P>

          <H2>Tradeoffs</H2>

          <Ul>
            <Li color="success">Prevents race conditions</Li>
            <Li color="error" isLast>
              Increases concurrent load on backend resources
            </Li>
          </Ul>

          <H2>Expected Behavior</H2>

          <P sx={{ mb: 2 }}>
            The frontend should abort the fetch if the user keeps typing. The
            backend will complete the request cycle though, because no special
            logic exists on this endpoint to terminate the database query early.
          </P>
          <P sx={{ mb: 2 }}>
            On my machine, I was able to trigger ~400 HTTP requests in 10
            seconds by typing random characters.
          </P>
          <P sx={{ mb: 2 }}>
            I saw database <code>CPU %</code> consumption spike to <b>~1200%</b>{" "}
            while typing.
          </P>
          <P>
            After stopping typing, database <code>CPU %</code> returned to ~0%
            in <b>~1 minute</b>.
          </P>

          <Divider sx={{ mt: 4, mb: 4 }} />

          <H2>3. E2E Abort 🤓</H2>

          <Box sx={{ mb: 2 }}>
            <AutocompleteWrapper
              label="Search dogs by name"
              getSearchUrl={(inputValue) =>
                `${BACKEND_URL}/v1/dogs/cancelable/search?name=${encodeURIComponent(
                  inputValue
                )}`
              }
            />
          </Box>
          <P sx={{ mb: 2 }}>
            The frontend uses an AbortController to abort HTTP requests when the
            search term changes.
          </P>
          <P sx={{ mb: 2 }}>
            The backend handles closed HTTP connections by terminating the
            database query.
          </P>
          <P>
            This frees database resources faster when the frontend aborts the
            fetch.
          </P>

          <H2>Tradeoffs</H2>

          <Ul>
            <Li color="success">Optimizes resource usage</Li>
            <Li color="error" isLast>
              Requires complex implementation across multiple system layers
            </Li>
          </Ul>

          <H2>Expected Behavior</H2>

          <P sx={{ mb: 2 }}>
            The frontend should abort the fetch if the user keeps typing.
            However, because the backend implementation terminates the database
            query when the connection is closed, database resources should be
            freed much faster, even when the user types quickly, emitting
            numerous requests.
          </P>
          <P sx={{ mb: 2 }}>
            On my machine, I was able to trigger ~400 HTTP requests in 10
            seconds by typing random characters. I saw the database{" "}
            <code>CPU %</code> spike to <b>~400%</b> while typing.
          </P>
          <P sx={{ mb: 2 }}>
            After stopping typing, database <code>CPU %</code> returned to ~0%
            in <b>~4 seconds</b>.
          </P>
          <P>
            Compared to the previous example, this is a{" "}
            <b>significant improvement in database resource usage</b>. Based on
            the figures I observed, this approach reduces CPU usage during the
            traffic spike by <b>~3x</b>, and reduces the duration of CPU usage
            spike by <b>~15x</b>.
          </P>
        </div>

        <div className="card">
          <H1>Results</H1>

          <P>
            The following charts compare the performance of each approach during
            my tests.
          </P>

          <H2>Wait Time</H2>

          <P sx={{ mb: 2 }}>
            This chart shows <b>how long</b> the UI was waiting for results for
            the latest search term.
          </P>
          <WaitTimeChart />

          <H2>Database CPU Saturation Duration</H2>

          <P sx={{ mb: 2 }}>
            This chart shows <b>how long</b> the database was under heavy load
            during the spike in requests initiated by the UI.
          </P>
          <SpikeDurationChart />

          <H2>Database CPU Usage</H2>

          <P sx={{ mb: 2 }}>
            This chart shows <b>how much</b> CPU was consumed by the database
            while under heavy load during the spike in requests initiated by the
            UI.
          </P>
          <CpuConsumptionChart />
        </div>

        <div className="card">
          <H1>Conclusion</H1>
          <P sx={{ mb: 2 }}>
            End-to-end request cancellation can help optimize resource usage,
            notably when database optimization is infeasible.
          </P>
          <P sx={{ mb: 2 }}>
            Query cancellation's benefit scales linearly with the cost of the
            database query. The more costly the query, the more beneficial it
            will be to cancel it.
          </P>
          <P>
            However, before using this approach, be aware of its associated
            challenges.
          </P>

          <H2>Additional Considerations</H2>

          <H3>Learning Curve</H3>
          <P sx={{ mb: 2 }}>
            The implementation in this demo requires familiarity with{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://en.wikipedia.org/wiki/Reactive_programming"
            >
              reactive programming
            </a>{" "}
            and RxJS. Consider that future newcomers to your project may be
            unfamiliar with this paradigm, which may raise your project's
            barrier to entry.
          </P>

          <H3>Connection Pool Management</H3>
          <P>
            The <code>pg_cancel_backend</code> query requires its own database
            connection, and must be executed swiftly to fulfill the intended
            purpose of freeing database resources as soon as possible. Thus, you
            must ensure connections will be readily available to handle query
            cancellation to achieve the performance benefits. Consider using a
            dedicated connection pool for cancellations.
          </P>
        </div>
      </div>
    </ThemeProvider>
  );
}

const AutocompleteWrapper = ({
  label,
  getSearchUrl,
  useAbortController = true,
}: {
  label: string;
  getSearchUrl: (inputValue: string) => string;
  useAbortController?: boolean;
}) => {
  const [options, setOptions] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const abortPreviousFetch = () => {
    if (
      useAbortController &&
      abortController &&
      !abortController.signal.aborted
    ) {
      abortController.abort();
    }
  };

  const fetchWithAbortController = async (url: RequestInfo | URL) => {
    const ac = useAbortController ? new AbortController() : undefined;
    setAbortController(ac ?? null);

    try {
      setLoading(true);
      const response = await fetch(url, { signal: ac?.signal });
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
  };

  return (
    <Autocomplete<Dog>
      options={options}
      loading={loading}
      getOptionLabel={(option) => option.name}
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      onInputChange={(_: unknown, newInputValue: string) => {
        abortPreviousFetch();
        fetchWithAbortController(getSearchUrl(newInputValue));
      }}
      renderInput={(params: AutocompleteRenderInputParams) => (
        <TextField
          {...params}
          label={label}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
};

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

export const H2 = ({ children, ...props }: TypographyProps) => (
  <Typography
    variant="h5"
    component="h2"
    gutterBottom
    sx={{ mt: 3 }}
    {...props}
  >
    {children}
  </Typography>
);

const H3 = ({ children, ...props }: TypographyProps) => (
  <Typography
    variant="h6"
    component="h3"
    gutterBottom
    sx={{ mt: 2 }}
    {...props}
  >
    {children}
  </Typography>
);

function Li({ children, color, isLast = false }: LiProps) {
  return (
    <li
      style={{
        color: color ? COLORS[color] : undefined,
        backgroundColor: color ? `${COLORS[color]}15` : undefined,
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        marginBottom: isLast ? 0 : "0.5rem",
      }}
    >
      {children}
    </li>
  );
}

interface LiProps {
  children: React.ReactNode;
  color?: keyof typeof COLORS;
  isLast?: boolean;
}

interface Dog {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const COLORS = {
  success: "#4caf50",
  error: "#f44336",
} as const;

const darkTheme = createTheme({ palette: { mode: "dark" } });

export default App;
