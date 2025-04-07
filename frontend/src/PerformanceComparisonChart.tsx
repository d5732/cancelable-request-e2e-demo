import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const approachData = [
  {
    name: "No Abort",
    waitTime: 60,
    cpuSpike: 1200,
    saturationDuration: 70,
  },
  {
    name: "Simple Abort",
    waitTime: 60,
    cpuSpike: 1200,
    saturationDuration: 70,
  },
  {
    name: "E2E Abort",
    waitTime: 1,
    cpuSpike: 400,
    saturationDuration: 4,
  },
];

type MetricChartProps = {
  title: string;
  dataKey: string;
  color: string;
};

function MetricChart({ title, dataKey, color }: MetricChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart layout="vertical" data={approachData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tick={{ fill: "#b0b0b0" }} />
        <YAxis
          dataKey="name"
          type="category"
          width={100}
          tick={{ fill: "#b0b0b0" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#333",
            border: "none",
            color: "#fff",
          }}
          itemStyle={{ color: "#ddd" }}
        />
        <Legend wrapperStyle={{ color: "#ccc" }} />
        <Bar dataKey={dataKey} fill={color} name={title} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WaitTimeChart() {
  return (
    <MetricChart
      title="Wait Time (seconds)"
      dataKey="waitTime"
      color="#8884d8"
    />
  );
}

export function SpikeDurationChart() {
  return (
    <MetricChart
      title="Database CPU Saturation Duration (seconds)"
      dataKey="saturationDuration"
      color="#ffc658"
    />
  );
}

export function CpuConsumptionChart() {
  return (
    <MetricChart
      title="Database CPU Consumption (%)"
      dataKey="cpuSpike"
      color="#82ca9d"
    />
  );
}
