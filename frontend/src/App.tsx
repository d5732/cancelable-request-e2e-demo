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
        <H1>E2E Cancelable Requests</H1>

        <div className="card">
          <H2>Why Would You Want to Cancel a Request?</H2>
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
          </P>
          <P sx={{ mb: 2 }}>
            This limitation presents challenges for dynamic UIs that require
            frequent data updates. The browser's connection limit can cause
            requests to pile up in a queue, increasing wait times.
          </P>
          <P sx={{ mb: 2 }}>
            Even within the connection limit, multiple requests can produce race
            conditions, because response ordering is not guaranteed.
          </P>
          <P sx={{ mb: 2 }}>
            To avoid these issues, dynamic UIs may want to cancel requests which
            no longer correspond to the current application state. The{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://developer.mozilla.org/en-US/docs/Web/API/AbortController"
            >
              AbortController API
            </a>{" "}
            offers a solution by enabling frontend applications to terminate
            pending HTTP requests.
          </P>
          <H2>So I Can Cancel a Request, What's the Problem?</H2>
          <P sx={{ mb: 2 }}>
            Aborting requests effectively bypasses concurrent connection limits
            set natively by the browser. So, this raises an important question:{" "}
            <b>is your backend ready for this?</b>
          </P>
          <P sx={{ mb: 2 }}>
            There are a few different philosophies to approach this problem
            with. One is the make operations efficient, such that the extra work
            the backend must perform does not degrade overall performance
            noticeably. This is a conventional, and effective approach.
          </P>
          <P sx={{ mb: 2 }}>
            However, sometimes the extra work is simply too costly, and we must
            consider the other alternative:{" "}
            <b>make operations cancelable end-to-end.</b>
          </P>
          <P sx={{ mb: 2 }}></P>
          <H2>What Is This Demo App?</H2>
          <P sx={{ mb: 2 }}>
            This demo explores graceful end-to-end termination of backend
            operations when they're no longer needed by the frontend.
          </P>
          <P sx={{ mb: 2 }}>
            To demonstrate the performance benefit, we will explore 3 different
            autocomplete typeaheads that fetch a list of dogs from a backend
            API. 🐕
          </P>
          <P sx={{ mb: 2 }}>
            The backend is a Node.js API with a PostgreSQL database.
          </P>
          <P sx={{ mb: 2 }}>
            The database's{" "}
            <b>
              <code>dog.name</code>
            </b>{" "}
            column is deliberately <b>not indexed</b>. The query is{" "}
            <code>SELECT * FROM dogs WHERE name ILIKE '%$1%' LIMIT 500;</code>.
            Each database query will perform a full table scan. These
            constraints make the query slow enough to observe the impact of
            cancelable requests.
          </P>
        </div>

        <H1>Setup Instructions</H1>

        <div className="card">
          <H2>Create an Environment with a Slow Database Query</H2>

          <P sx={{ mb: 2 }}>
            First, we need a database query that is slow enough to give a good
            threshold for observation.
          </P>
          <P sx={{ mb: 2 }}>
            Navigate to{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="http://localhost:3000/swagger#/dogs/AppController_seedDogs"
            >
              Swagger UI
            </a>{" "}
            to seed the database with dog records. On my machine, I had to seed
            at least 1 million dog records before the query took longer than 1
            second.
          </P>

          <H2>Observe Resource Impact</H2>

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
            This will display CPU usage, etc., of the database container,
            allowing you to observe the resource impact of each different
            approach.
          </P>
        </div>

        <H1>Implementation Examples</H1>

        <div className="card">
          <H2>1. No Abort 😅</H2>

          <AutocompleteWrapper
            useAbortController={false}
            label="Search dogs by name"
            getUrl={(inputValue) =>
              `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                inputValue
              )}`
            }
          />
          <Box sx={{ mt: 2 }}>
            <P sx={{ mb: 2 }}>
              In this example, the frontend foregoes request termination
              entirely, allowing concurrent requests to complete regardless of
              UI state changes.
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
              Because no requests are canceled, a queue of requests may pile up
              on the frontend, taking a long time to cycle through. This puts
              consistent pressure on the database, and delays the return of the
              only significant result (the last request), resulting in a poor
              user experience.
            </P>
            <P sx={{ mb: 2 }}>
              On my machine, I was able to queue ~400 HTTP requests in 10
              seconds by typing random characters.
            </P>
            <P sx={{ mb: 2 }}>
              It took <b>~1 minute</b> to cycle through the queue of requests on
              the frontend.
            </P>
            <P sx={{ mb: 2 }}>
              I saw the database <code>CPU %</code> spike to <b>~1200%</b> while
              the frontend cycled through the queue of requests.
            </P>
          </Box>
        </div>

        <div className="card">
          <H2>2. Simple Abort 🤔</H2>

          <AutocompleteWrapper
            label="Search dogs by name"
            getUrl={(inputValue) =>
              `${BACKEND_URL}/v1/dogs/search?name=${encodeURIComponent(
                inputValue
              )}`
            }
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
              same-origin connections, potentially increasing the load on the
              backend.
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
              logic exists on this endpoint to terminate the database query
              early.
            </P>
            <P sx={{ mb: 2 }}>
              On my machine, I was able to trigger ~400 HTTP requests in 10
              seconds by typing random characters.
            </P>
            <P sx={{ mb: 2 }}>
              I saw database <code>CPU %</code> consumption spike to{" "}
              <b>~1200%</b> while typing.
            </P>
            <P sx={{ mb: 2 }}>
              After stopping typing, database <code>CPU %</code> returned to ~0%
              in <b>~1 minute</b>.
            </P>
          </Box>
        </div>

        <div className="card">
          <H2>3. E2E Abort 🤓</H2>

          <AutocompleteWrapper
            label="Search dogs by name"
            getUrl={(inputValue) =>
              `${BACKEND_URL}/v1/dogs/cancelable/search?name=${encodeURIComponent(
                inputValue
              )}`
            }
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
              However, because the backend implementation terminates the
              database query when the connection is closed, database resources
              should be freed much faster, even when the user types quickly,
              emitting numerous requests.
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
            <P sx={{ mb: 2 }}>
              Compared to the previous example, this is a{" "}
              <b>significant improvement in database resource usage</b>. Based
              on the figures I observed, this approach reduces CPU usage during
              the traffic spike by <b>~3x</b>, and reduces the duration of CPU
              usage spike by <b>~15x</b>.
            </P>
          </Box>
        </div>

        <H1>Metrics</H1>

        <div className="card">
          <P sx={{ mb: 2 }}>
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

        <H1>Conclusion</H1>

        <div className="card">
          <P sx={{ mb: 2 }}>
            Canceling database queries can help optimize resource usage, notably
            when database optimization is infeasible. For any given query, the
            more costly it is to execute, the more beneficial it will be to
            cancel it when the initiator no longer needs the result.
          </P>
          <P sx={{ mb: 2 }}>
            Before using this approach, be aware of the challenges that come
            with it.
          </P>
          <H2>Challenges</H2>
          <P sx={{ mb: 2 }}>
            <b>Learning Curve:</b> The implementation requires familiarity with{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://en.wikipedia.org/wiki/Reactive_programming"
            >
              reactive programming
            </a>{" "}
            and RxJS. This could raise your project's barrier to entry, and slow
            down onboarding of new team members.
          </P>
          <P sx={{ mb: 2 }}>
            <b>Connection Pool Management:</b> The{" "}
            <code>pg_cancel_backend</code> query requires its own database
            connection. These cancellations must be executed swiftly to fulfill
            their intended purpose of freeing database resources as soon as
            possible. So, you will need to ensure that your connection pool has
            enough capacity to handle the cancellation requests. Consider using
            a dedicated connection pool just for cancellations.
          </P>
        </div>
      </div>
    </ThemeProvider>
  );
}

const AutocompleteWrapper = ({
  label,
  getUrl,
  useAbortController = true,
}: {
  label: string;
  getUrl: (inputValue: string) => string;
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
        fetchWithAbortController(getUrl(newInputValue));
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
