import { useEffect, useState } from "react";
import Chart from "react-google-charts";

const colors = [
  "#fca5a5",
  "#fdba74",
  "#fcd34d",
  "#fde047",
  "#bef264",
  "#86efac",
  "#6ee7b7",
  "#5eead4",
  "#67e8f9",
  "#7dd3fc",
  "#93c5fd",
  "#a5b4fc",
  "#c4b5fd",
  "#d8b4fe",
  "#f0abfc",
  "#f9a8d4",
  "#fda4af",
  "#cbd5e1",
  "#d1d5db",
  "#d4d4d8",
  "#d4d4d4",
  "#d6d3d1",
  "#a8a29e",
  "#a3a3a3",
  "#a8a29e",
  "#a3a3a3",
  "#a1a1aa",
  "#9ca3af",
  "#94a3b8",
  "#64748b",
  "#6b7280",
  "#71717a",
  "#737373",
  "#78716c",
  "#57534e",
  "#525252",
];

type chartData = [string, string | number, { role: string } | string][];

export default function PieChart({ data }: any) {
    const [chartData,setchartData] = useState<chartData>([["",0,""]]);
  useEffect(() => {
    let c = 0;
    const t: { [keys: number | string]: number } = {};
    Object.keys(data).forEach((key: string) => {
        const rate = data[key].rating || "special";
        if(rate in t) t[rate]++;
        else
        t[rate]=0;
    //   data[key].rating.forEach((tag: string) => {
    //     if (tag in t) t[tag]++;
    //     else t[tag] = 1;
    //   });
    });

    const d: [string, string | number, { role: string } | string][] = [
      ["tags", "number of questions solved", { role: "style" }],
    ];
    Object.keys(t).forEach((key) => {
      d.push([key, t[key], colors[c]]);
      c++;
    });
    setchartData(d);
  }, [data]);

  const options = {
    title: "Rating vs number of problems",
    chartArea: { width: "auto" },
    hAxis: {
      title: "Rating",
      minValue: 0,
    },
    vAxis: {
      title: "Tags",
    },
    legend: { position: "top", alignment: "end" },
  };

  return (
    <div className="md:w-1/2 w-full">
      <Chart chartType="PieChart" width="100%" height="400px" data={chartData} options={options} />
    </div>
  );
}
